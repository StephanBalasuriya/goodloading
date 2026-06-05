import os
import re
import json
from datetime import datetime, timedelta, timezone
from typing import Optional

import uvicorn
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from db_config.db import SessionLocal, init_db
from Schema.schemas import GmproUsedVehicle, VehicleCreate, VehicleUpdate, VehicleResponse
from services.gmpro_cache import get_valid_gmpro_response
from services.goodloading_service import calculate_loading, map_loading, recommend_loading
from services.gmpro_service import get_gmpro_response, handle_gmpro_response
from services.email_service import send_otp_email
from services.auth_service import hash_password, verify_password, create_jwt, decode_jwt, generate_otp

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
def startup_event():
    init_db()


# --- Pydantic Schemas for Auth ---

class OrgSignupOtpRequest(BaseModel):
    name: str
    email: str
    password: str
    confirm_password: str
    phone_number: Optional[str] = None


class VerifyOtpRequest(BaseModel):
    email: str
    otp_code: str


class UserSignupOtpRequest(BaseModel):
    name: str
    email: str
    password: str
    confirm_password: str
    organization_email: str


class LoginRequest(BaseModel):
    email: str
    password: str
    role: str  # 'organization' or 'user'


# --- Auth Security Dependency ---

security = HTTPBearer()

def get_current_entity(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = decode_jwt(token)
        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid or expired token: {str(e)}")


# --- Auth API Endpoints ---

@app.post("/api/auth/organization/signup-otp")
def org_signup_otp(req: OrgSignupOtpRequest, db: Session = Depends(get_db)):
    if req.password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")
        
    # Check if organization already exists
    exists = db.execute(
        text("SELECT 1 FROM organizations WHERE email = :email"),
        {"email": req.email}
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail="Organization email is already registered.")
        
    otp = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=3)
    
    data_json = json.dumps({
        "name": req.name,
        "password": req.password,
        "phone_number": req.phone_number
    })
    
    db.execute(
        text("""
            INSERT INTO otp_verifications (email, otp_code, purpose, data, expires_at)
            VALUES (:email, :otp_code, 'organization_signup', CAST(:data AS JSONB), :expires_at)
        """),
        {
            "email": req.email,
            "otp_code": otp,
            "data": data_json,
            "expires_at": expires_at
        }
    )
    db.commit()
    
    # Send email
    send_otp_email(req.email, otp, req.name, "organization_signup")
    
    return {"message": "OTP verification code sent to your email."}


@app.post("/api/auth/organization/verify-otp")
def org_verify_otp(req: VerifyOtpRequest, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    record = db.execute(
        text("""
            SELECT id, data, expires_at 
            FROM otp_verifications 
            WHERE email = :email AND otp_code = :otp_code AND purpose = 'organization_signup'
            ORDER BY created_at DESC LIMIT 1
        """),
        {"email": req.email, "otp_code": req.otp_code}
    ).mappings().first()
    
    if not record:
        raise HTTPException(status_code=400, detail="Invalid OTP code.")
        
    expires_at = record["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
        
    if expires_at < now:
        raise HTTPException(status_code=400, detail="OTP code has expired. Please sign up again.")
        
    raw_data = record["data"]
    data = json.loads(raw_data) if isinstance(raw_data, str) else raw_data
    
    pwd_hash = hash_password(data["password"])
    
    try:
        result = db.execute(
            text("""
                INSERT INTO organizations (name, email, password_hash, phone_number)
                VALUES (:name, :email, :password_hash, :phone_number)
                RETURNING id, name, email
            """),
            {
                "name": data["name"],
                "email": req.email,
                "password_hash": pwd_hash,
                "phone_number": data.get("phone_number")
            }
        ).mappings().first()
        
        if not result:
            raise HTTPException(status_code=500, detail="Failed to retrieve organization details after registration.")
            
        org_id = str(result["id"])
        org_name = result["name"]
        org_email = result["email"]
        
        db.execute(
            text("DELETE FROM otp_verifications WHERE email = :email"),
            {"email": req.email}
        )
        db.commit()
        
        return {
            "message": "Organization registered successfully.",
            "organization": {
                "id": org_id,
                "name": org_name,
                "email": org_email
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error during creation: {str(e)}")


@app.post("/api/auth/user/signup-otp")
def user_signup_otp(req: UserSignupOtpRequest, db: Session = Depends(get_db)):
    if req.password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")
        
    user_exists = db.execute(
        text("SELECT 1 FROM app_users WHERE email = :email"),
        {"email": req.email}
    ).first()
    if user_exists:
        raise HTTPException(status_code=400, detail="User email is already registered.")
        
    org = db.execute(
        text("SELECT id, name FROM organizations WHERE email = :org_email"),
        {"org_email": req.organization_email}
    ).mappings().first()
    if not org:
        raise HTTPException(status_code=400, detail="Organization not found with the provided email.")
        
    otp = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=3)
    
    data_json = json.dumps({
        "name": req.name,
        "password": req.password,
        "organization_email": req.organization_email
    })
    
    db.execute(
        text("""
            INSERT INTO otp_verifications (email, otp_code, purpose, data, expires_at)
            VALUES (:email, :otp_code, 'user_signup', CAST(:data AS JSONB), :expires_at)
        """),
        {
            "email": req.email,
            "otp_code": otp,
            "data": data_json,
            "expires_at": expires_at
        }
    )
    db.commit()
    
    # Send email to organization email
    send_otp_email(req.organization_email, otp, req.name, "user_signup")
    
    return {"message": "OTP verification code sent to the organization administrator's email."}


@app.post("/api/auth/user/verify-otp")
def user_verify_otp(req: VerifyOtpRequest, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    record = db.execute(
        text("""
            SELECT id, data, expires_at 
            FROM otp_verifications 
            WHERE email = :email AND otp_code = :otp_code AND purpose = 'user_signup'
            ORDER BY created_at DESC LIMIT 1
        """),
        {"email": req.email, "otp_code": req.otp_code}
    ).mappings().first()
    
    if not record:
        raise HTTPException(status_code=400, detail="Invalid OTP code.")
        
    expires_at = record["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
        
    if expires_at < now:
        raise HTTPException(status_code=400, detail="OTP code has expired. Please sign up again.")
        
    raw_data = record["data"]
    data = json.loads(raw_data) if isinstance(raw_data, str) else raw_data
    
    org = db.execute(
        text("SELECT id FROM organizations WHERE email = :org_email"),
        {"org_email": data["organization_email"]}
    ).mappings().first()
    if not org:
        raise HTTPException(status_code=400, detail="Associated organization no longer exists.")
        
    pwd_hash = hash_password(data["password"])
    
    try:
        result = db.execute(
            text("""
                INSERT INTO app_users (name, email, password_hash, organization_id)
                VALUES (:name, :email, :password_hash, :org_id)
                RETURNING id, name, email
            """),
            {
                "name": data["name"],
                "email": req.email,
                "password_hash": pwd_hash,
                "org_id": org["id"]
            }
        ).mappings().first()
        
        if not result:
            raise HTTPException(status_code=500, detail="Failed to retrieve user details after registration.")
            
        user_id = str(result["id"])
        user_name = result["name"]
        user_email = result["email"]
        
        db.execute(
            text("DELETE FROM otp_verifications WHERE email = :email"),
            {"email": req.email}
        )
        db.commit()
        
        return {
            "message": "User registered successfully.",
            "user": {
                "id": user_id,
                "name": user_name,
                "email": user_email
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error during creation: {str(e)}")


@app.post("/api/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    if req.role == "organization":
        org = db.execute(
            text("SELECT id, name, email, password_hash, phone_number FROM organizations WHERE email = :email"),
            {"email": req.email}
        ).mappings().first()
        
        if not org or not verify_password(req.password, org["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password.")
            
        token = create_jwt({
            "id": str(org["id"]),
            "name": org["name"],
            "email": org["email"],
            "role": "organization"
        })
        
        return {
            "token": token,
            "user": {
                "id": str(org["id"]),
                "name": org["name"],
                "email": org["email"],
                "role": "organization",
                "phone_number": org["phone_number"]
            }
        }
    elif req.role == "user":
        user = db.execute(
            text("SELECT id, name, email, password_hash, organization_id FROM app_users WHERE email = :email"),
            {"email": req.email}
        ).mappings().first()
        
        if not user or not verify_password(req.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password.")
            
        org = db.execute(
            text("SELECT name FROM organizations WHERE id = :org_id"),
            {"org_id": user["organization_id"]}
        ).mappings().first()
        org_name = org["name"] if org else "Unknown Organization"
        
        token = create_jwt({
            "id": str(user["id"]),
            "name": user["name"],
            "email": user["email"],
            "role": "user",
            "organization_id": str(user["organization_id"]),
            "organization_name": org_name
        })
        
        return {
            "token": token,
            "user": {
                "id": str(user["id"]),
                "name": user["name"],
                "email": user["email"],
                "role": "user",
                "organization_id": str(user["organization_id"]),
                "organization_name": org_name
            }
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid login role specified.")


@app.get("/api/auth/me")
def get_me(current_entity: dict = Depends(get_current_entity)):
    return current_entity


@app.post("/calculate")
def calculate_loading_endpoint(data: dict):
    return calculate_loading(data)

@app.post("/recommend")
def recommend_loading_endpoint(data: dict):
    return recommend_loading(data)
    
@app.post("/map")
def map_loading_endpoint(data: dict):
    return map_loading(data)
    
@app.post("/GMPROResponse")
def handle_gmpro_response_endpoint(data: dict):
    return handle_gmpro_response(data)


@app.get("/GMPROResponse")
def get_gmpro_response_endpoint():
    return get_gmpro_response()


def _normalize_vehicle_type(label: str) -> str:
    normalized = re.sub(r"(?i)^vehicle[_\s-]*", "", label).strip()
    normalized = re.sub(r"\d+$", "", normalized).strip()
    normalized = normalized.replace("_", " ")
    return re.sub(r"\s+", " ", normalized).strip()


@app.get("/vehicles/used", response_model=list[GmproUsedVehicle])
def get_used_vehicles_from_gmpro(db: Session = Depends(get_db)):
    payload = get_valid_gmpro_response()
    if payload is None:
        raise HTTPException(status_code=404, detail="No valid GMPRO response available")

    routes = payload.get("routes")
    if not isinstance(routes, list):
        raise HTTPException(status_code=422, detail="Invalid GMPRO response: routes must be an array")

    used_labels: list[str] = []
    for route in routes:
        if not isinstance(route, dict):
            continue

        visits = route.get("visits")
        label = route.get("vehicleLabel")
        if isinstance(label, str) and label and isinstance(visits, list) and len(visits) > 0:
            used_labels.append(label)

    if not used_labels:
        return []

    result: list[GmproUsedVehicle] = []
    for label in used_labels:
        type_name = _normalize_vehicle_type(label)
        row = db.execute(
            text(
                """
                SELECT
                    vt.id AS type_id,
                    vt.name AS type_name,
                    vt.count AS count,
                    vt.is_active AS is_active,
                    vs.length_cm AS length_cm,
                    vs.width_cm AS width_cm,
                    vs.height_cm AS height_cm,
                    vs.max_weight_kg AS max_weight_kg,
                    vs.max_cbm AS max_cbm
                FROM vehicle_types vt
                JOIN vehicle_specs vs ON vs.type_id = vt.id
                WHERE lower(vt.name) = lower(:type_name)
                LIMIT 1
                """
            ),
            {"type_name": type_name},
        ).mappings().first()

        if row is None:
            continue

        result.append(
            GmproUsedVehicle(
                gmpro_vehicle_label=label,
                gmpro_vehicle_type=type_name,
                type_id=row["type_id"],
                type_name=row["type_name"],
                count=row["count"],
                is_active=row["is_active"],
                length_cm=row["length_cm"],
                width_cm=row["width_cm"],
                height_cm=row["height_cm"],
                max_weight_kg=row["max_weight_kg"],
                max_cbm=row["max_cbm"],
            )
        )

    return result


@app.get("/vehicles/", response_model=list[VehicleResponse])
def get_vehicles(db: Session = Depends(get_db)):
    try:
        rows = db.execute(
            text(
                """
                SELECT
                    vt.id AS id,
                    vt.name AS name,
                    vs.length_cm AS length_cm,
                    vs.width_cm AS width_cm,
                    vs.height_cm AS height_cm,
                    vs.max_weight_kg AS max_weight_kg,
                    vt.count AS quantity,
                    vt.created_at AS created_at,
                    vt.created_at AS updated_at
                FROM vehicle_types vt
                LEFT JOIN vehicle_specs vs ON vs.type_id = vt.id
                ORDER BY vt.id ASC
                """
            )
        ).mappings().all()
        
        result = []
        for row in rows:
            result.append(
                VehicleResponse(
                    id=row["id"],
                    name=row["name"] or "",
                    length_cm=float(row["length_cm"] or 0),
                    width_cm=float(row["width_cm"] or 0),
                    height_cm=float(row["height_cm"] or 0),
                    max_weight_kg=float(row["max_weight_kg"] or 0),
                    quantity=row["quantity"] or 1,
                    created_at=row["created_at"],
                    updated_at=row["updated_at"]
                )
            )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.post("/vehicles/", response_model=VehicleResponse)
def create_vehicle(vehicle: VehicleCreate, db: Session = Depends(get_db)):
    try:
        # 1. Get next ID for vehicle_types
        vt_id = db.execute(text("SELECT COALESCE(MAX(id), 0) + 1 FROM vehicle_types")).scalar() or 1
        
        # 2. Get next ID for vehicle_specs
        vs_id = db.execute(text("SELECT COALESCE(MAX(id), 0) + 1 FROM vehicle_specs")).scalar() or 1
        
        # 3. Insert into vehicle_types
        db.execute(
            text(
                """
                INSERT INTO vehicle_types (id, name, count, is_active, created_at)
                VALUES (:id, :name, :count, :is_active, NOW())
                """
            ),
            {
                "id": vt_id,
                "name": vehicle.name,
                "count": vehicle.quantity,
                "is_active": True
            }
        )
        
        # 4. Calculate max_cbm
        max_cbm = (vehicle.length_cm * vehicle.width_cm * vehicle.height_cm) / 1000000.0
        
        # 5. Insert into vehicle_specs
        db.execute(
            text(
                """
                INSERT INTO vehicle_specs (id, type_id, max_cbm, max_weight_kg, length_cm, width_cm, height_cm)
                VALUES (:id, :type_id, :max_cbm, :max_weight_kg, :length_cm, :width_cm, :height_cm)
                """
            ),
            {
                "id": vs_id,
                "type_id": vt_id,
                "max_cbm": max_cbm,
                "max_weight_kg": int(vehicle.max_weight_kg),
                "length_cm": vehicle.length_cm,
                "width_cm": vehicle.width_cm,
                "height_cm": vehicle.height_cm
            }
        )
        
        db.commit()
        
        # 6. Retrieve the newly created vehicle
        row = db.execute(
            text(
                """
                SELECT
                    vt.id AS id,
                    vt.name AS name,
                    vs.length_cm AS length_cm,
                    vs.width_cm AS width_cm,
                    vs.height_cm AS height_cm,
                    vs.max_weight_kg AS max_weight_kg,
                    vt.count AS quantity,
                    vt.created_at AS created_at
                FROM vehicle_types vt
                LEFT JOIN vehicle_specs vs ON vs.type_id = vt.id
                WHERE vt.id = :id
                """
            ),
            {"id": vt_id}
        ).mappings().first()
        
        if not row:
            raise HTTPException(status_code=500, detail="Failed to retrieve created vehicle.")
            
        return VehicleResponse(
            id=row["id"],
            name=row["name"] or "",
            length_cm=float(row["length_cm"] or 0),
            width_cm=float(row["width_cm"] or 0),
            height_cm=float(row["height_cm"] or 0),
            max_weight_kg=float(row["max_weight_kg"] or 0),
            quantity=row["quantity"] or 1,
            created_at=row["created_at"],
            updated_at=row["created_at"]
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error during creation: {str(e)}")


@app.put("/vehicles/{vehicle_id}", response_model=VehicleResponse)
def update_vehicle(vehicle_id: int, vehicle: VehicleUpdate, db: Session = Depends(get_db)):
    try:
        # 1. Check if vehicle exists
        exists = db.execute(
            text("SELECT 1 FROM vehicle_types WHERE id = :id"),
            {"id": vehicle_id}
        ).first()
        if not exists:
            raise HTTPException(status_code=404, detail="Vehicle not found")
            
        # 2. Update vehicle_types
        db.execute(
            text(
                """
                UPDATE vehicle_types
                SET name = :name, count = :count
                WHERE id = :id
                """
            ),
            {
                "id": vehicle_id,
                "name": vehicle.name,
                "count": vehicle.quantity
            }
        )
        
        # 3. Calculate max_cbm
        max_cbm = (vehicle.length_cm * vehicle.width_cm * vehicle.height_cm) / 1000000.0
        
        # 4. Check if spec exists for this type_id
        spec_exists = db.execute(
            text("SELECT id FROM vehicle_specs WHERE type_id = :type_id"),
            {"type_id": vehicle_id}
        ).mappings().first()
        
        if spec_exists:
            db.execute(
                text(
                    """
                    UPDATE vehicle_specs
                    SET max_cbm = :max_cbm, max_weight_kg = :max_weight_kg,
                        length_cm = :length_cm, width_cm = :width_cm, height_cm = :height_cm
                    WHERE type_id = :type_id
                    """
                ),
                {
                    "type_id": vehicle_id,
                    "max_cbm": max_cbm,
                    "max_weight_kg": int(vehicle.max_weight_kg),
                    "length_cm": vehicle.length_cm,
                    "width_cm": vehicle.width_cm,
                    "height_cm": vehicle.height_cm
                }
            )
        else:
            vs_id = db.execute(text("SELECT COALESCE(MAX(id), 0) + 1 FROM vehicle_specs")).scalar() or 1
            db.execute(
                text(
                    """
                    INSERT INTO vehicle_specs (id, type_id, max_cbm, max_weight_kg, length_cm, width_cm, height_cm)
                    VALUES (:id, :type_id, :max_cbm, :max_weight_kg, :length_cm, :width_cm, :height_cm)
                    """
                ),
                {
                    "id": vs_id,
                    "type_id": vehicle_id,
                    "max_cbm": max_cbm,
                    "max_weight_kg": int(vehicle.max_weight_kg),
                    "length_cm": vehicle.length_cm,
                    "width_cm": vehicle.width_cm,
                    "height_cm": vehicle.height_cm
                }
            )
            
        db.commit()
        
        # 5. Retrieve updated vehicle
        row = db.execute(
            text(
                """
                SELECT
                    vt.id AS id,
                    vt.name AS name,
                    vs.length_cm AS length_cm,
                    vs.width_cm AS width_cm,
                    vs.height_cm AS height_cm,
                    vs.max_weight_kg AS max_weight_kg,
                    vt.count AS quantity,
                    vt.created_at AS created_at
                FROM vehicle_types vt
                LEFT JOIN vehicle_specs vs ON vs.type_id = vt.id
                WHERE vt.id = :id
                """
            ),
            {"id": vehicle_id}
        ).mappings().first()
        
        if not row:
            raise HTTPException(status_code=500, detail="Failed to retrieve updated vehicle.")
            
        return VehicleResponse(
            id=row["id"],
            name=row["name"] or "",
            length_cm=float(row["length_cm"] or 0),
            width_cm=float(row["width_cm"] or 0),
            height_cm=float(row["height_cm"] or 0),
            max_weight_kg=float(row["max_weight_kg"] or 0),
            quantity=row["quantity"] or 1,
            created_at=row["created_at"],
            updated_at=row["created_at"]
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error during update: {str(e)}")


@app.delete("/vehicles/{vehicle_id}")
def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    try:
        # 1. Check if vehicle exists
        exists = db.execute(
            text("SELECT 1 FROM vehicle_types WHERE id = :id"),
            {"id": vehicle_id}
        ).first()
        if not exists:
            raise HTTPException(status_code=404, detail="Vehicle not found")
            
        # 2. Delete from vehicle_specs
        db.execute(
            text("DELETE FROM vehicle_specs WHERE type_id = :type_id"),
            {"type_id": vehicle_id}
        )
        
        # 3. Delete from vehicle_types
        db.execute(
            text("DELETE FROM vehicle_types WHERE id = :id"),
            {"id": vehicle_id}
        )
        
        db.commit()
        return {"message": "Vehicle deleted successfully"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error during deletion: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8001")),
        reload=os.getenv("RELOAD", "true").lower() == "true",
    )