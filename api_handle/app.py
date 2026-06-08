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

from services.email_service import send_otp_email, send_invitation_email
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
def calculate_loading_endpoint(data: dict, current_entity: dict = Depends(get_current_entity), db: Session = Depends(get_db)):
    res = calculate_loading(data)
    return res

@app.post("/recommend")
def recommend_loading_endpoint(data: dict):
    return recommend_loading(data)
    
@app.post("/map")
def map_loading_endpoint(data: dict):
    return map_loading(data)
    
@app.post("/GMPROResponse")
def handle_gmpro_response_endpoint(data: dict, current_entity: dict = Depends(get_current_entity), db: Session = Depends(get_db)):
    try:
        if current_entity.get("role") == "user":
            db.execute(
                text("INSERT INTO gmpro_responses (user_id, response) VALUES (:id, CAST(:response AS JSONB))"),
                {"id": current_entity["id"], "response": json.dumps(data)}
            )
        else:
            db.execute(
                text("INSERT INTO gmpro_responses (organization_id, response) VALUES (:id, CAST(:response AS JSONB))"),
                {"id": current_entity["id"], "response": json.dumps(data)}
            )
        db.commit()
    except Exception as e:
        db.rollback()
        print("Failed to save gmpro_response activity:", e)
        raise HTTPException(status_code=500, detail="Database insertion failed")
    return {"status": "success", "message": "GMPRO response processed"}


@app.get("/GMPROResponse")
def get_gmpro_response_endpoint(current_entity: dict = Depends(get_current_entity), db: Session = Depends(get_db)):
    try:
        if current_entity.get("role") == "user":
            row = db.execute(
                text("""
                    SELECT response 
                    FROM gmpro_responses 
                    WHERE user_id = :id 
                    ORDER BY created_at DESC 
                    LIMIT 1
                """),
                {"id": current_entity["id"]}
            ).mappings().first()
        else:
            row = db.execute(
                text("""
                    SELECT response 
                    FROM gmpro_responses 
                    WHERE organization_id = :id 
                    ORDER BY created_at DESC 
                    LIMIT 1
                """),
                {"id": current_entity["id"]}
            ).mappings().first()
            
        if row:
            return {
                "available": True,
                "data": row["response"]
            }
    except Exception as e:
        print("Failed to fetch gmpro_response from db:", e)
        
    return {"available": False, "data": None}


# --- Organization Users & Activity Endpoints ---

class OrgUserCreateRequest(BaseModel):
    name: str
    email: str

@app.get("/api/organization/users")
def get_organization_users(current_entity: dict = Depends(get_current_entity), db: Session = Depends(get_db)):
    org_id = current_entity.get("organization_id") if current_entity.get("role") == "user" else current_entity.get("id")
    
    try:
        users = db.execute(
            text("""
                SELECT id, name, email, created_at
                FROM app_users
                WHERE organization_id = :org_id
                ORDER BY created_at DESC
            """),
            {"org_id": org_id}
        ).mappings().all()
        
        result = []
        for u in users:
            user_id = str(u["id"])
            
            count_res = db.execute(
                text("SELECT count(*) FROM gmpro_responses WHERE user_id = :user_id"),
                {"user_id": user_id}
            ).scalar() or 0
            
            recent_res = db.execute(
                text("SELECT id, created_at FROM gmpro_responses WHERE user_id = :user_id ORDER BY created_at DESC LIMIT 5"),
                {"user_id": user_id}
            ).mappings().all()
            
            recent_activities = []
            for r in recent_res:
                recent_activities.append({
                    "id": r["id"],
                    "created_at": r["created_at"]
                })
                
            result.append({
                "id": user_id,
                "name": u["name"],
                "email": u["email"],
                "created_at": u["created_at"],
                "activity_count": count_res,
                "recent_activities": recent_activities
            })
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.post("/api/organization/users")
def create_organization_user(req: OrgUserCreateRequest, current_entity: dict = Depends(get_current_entity), db: Session = Depends(get_db)):
    if current_entity.get("role") != "organization":
         raise HTTPException(status_code=403, detail="Only organization administrator can create users.")
         
    org_id = current_entity.get("id")
    
    # Check if user already exists
    user_exists = db.execute(
        text("SELECT 1 FROM app_users WHERE email = :email"),
        {"email": req.email}
    ).first()
    if user_exists:
        raise HTTPException(status_code=400, detail="User email is already registered.")
        
    import secrets
    import string
    alphabet = string.ascii_letters + string.digits
    temp_password = ''.join(secrets.choice(alphabet) for _ in range(10))
    pwd_hash = hash_password(temp_password)
    
    try:
        result = db.execute(
            text("""
                INSERT INTO app_users (name, email, password_hash, organization_id)
                VALUES (:name, :email, :password_hash, :org_id)
                RETURNING id, name, email
            """),
            {
                "name": req.name,
                "email": req.email,
                "password_hash": pwd_hash,
                "org_id": org_id
            }
        ).mappings().first()
        
        if not result:
            raise HTTPException(status_code=500, detail="Failed to retrieve user details after creation.")
            
        db.commit()
        
        # Send invitation email
        send_invitation_email(req.email, temp_password, req.name)
        
        return {
            "message": "User created successfully. Credentials have been emailed.",
            "user": {
                "id": str(result["id"]),
                "name": result["name"],
                "email": result["email"]
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error during creation: {str(e)}")


@app.delete("/api/organization/users/{user_id}")
def delete_organization_user(user_id: str, current_entity: dict = Depends(get_current_entity), db: Session = Depends(get_db)):
    if current_entity.get("role") != "organization":
         raise HTTPException(status_code=403, detail="Only organization administrator can delete users.")
         
    org_id = current_entity.get("id")
    
    try:
        exists = db.execute(
            text("SELECT 1 FROM app_users WHERE id = :user_id AND organization_id = :org_id"),
            {"user_id": user_id, "org_id": org_id}
        ).first()
        
        if not exists:
            raise HTTPException(status_code=404, detail="User not found in this organization.")
            
        db.execute(
            text("DELETE FROM app_users WHERE id = :user_id AND organization_id = :org_id"),
            {"user_id": user_id, "org_id": org_id}
        )
        db.commit()
        return {"message": "User deleted successfully."}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error during deletion: {str(e)}")


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

@app.post("/api/change-password")
def change_password_endpoint(req: ChangePasswordRequest, current_entity: dict = Depends(get_current_entity), db: Session = Depends(get_db)):
    if req.new_password != req.confirm_password:
        raise HTTPException(status_code=400, detail="New passwords do not match.")
        
    role = current_entity.get("role")
    entity_id = current_entity.get("id")
    
    if role == "organization":
        org = db.execute(
            text("SELECT password_hash FROM organizations WHERE id = :id"),
            {"id": entity_id}
        ).mappings().first()
        if not org or not verify_password(req.current_password, org["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid current password.")
            
        new_hash = hash_password(req.new_password)
        db.execute(
            text("UPDATE organizations SET password_hash = :hash WHERE id = :id"),
            {"hash": new_hash, "id": entity_id}
        )
        db.commit()
    elif role == "user":
        user = db.execute(
            text("SELECT password_hash FROM app_users WHERE id = :id"),
            {"id": entity_id}
        ).mappings().first()
        if not user or not verify_password(req.current_password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid current password.")
            
        new_hash = hash_password(req.new_password)
        db.execute(
            text("UPDATE app_users SET password_hash = :hash WHERE id = :id"),
            {"hash": new_hash, "id": entity_id}
        )
        db.commit()
    else:
        raise HTTPException(status_code=400, detail="Invalid role.")
        
    return {"message": "Password updated successfully."}


def _normalize_vehicle_type(label: str) -> str:
    normalized = re.sub(r"(?i)^vehicle[_\s-]*", "", label).strip()
    normalized = re.sub(r"\d+$", "", normalized).strip()
    normalized = normalized.replace("_", " ")
    return re.sub(r"\s+", " ", normalized).strip()


@app.get("/vehicles/used", response_model=list[GmproUsedVehicle])
def get_used_vehicles_from_gmpro(current_entity: dict = Depends(get_current_entity), db: Session = Depends(get_db)):
    org_id = current_entity.get("organization_id") if current_entity.get("role") == "user" else current_entity.get("id")
    
    # Fetch latest GMPRO response from the database
    if current_entity.get("role") == "user":
        row = db.execute(
            text("""
                SELECT response 
                FROM gmpro_responses 
                WHERE user_id = :id 
                ORDER BY created_at DESC 
                LIMIT 1
            """),
            {"id": current_entity["id"]}
        ).mappings().first()
    else:
        # Organization fallback if applicable, assuming organization_id exists or it might fail if table is strictly user_id
        # We will attempt it the same way GET /GMPROResponse works
        row = db.execute(
            text("""
                SELECT response 
                FROM gmpro_responses 
                WHERE organization_id = :id 
                ORDER BY created_at DESC 
                LIMIT 1
            """),
            {"id": current_entity["id"]}
        ).mappings().first()

    if not row or not row["response"]:
        raise HTTPException(status_code=404, detail="No valid GMPRO response available")
        
    payload = row["response"]
    
    # Safely parse string JSON to dict if it was stored as text, though JSONB maps to dict directly in async/psycopg usually
    if isinstance(payload, str):
        import json
        payload = json.loads(payload)

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
                WHERE lower(vt.name) = lower(:type_name) AND (vt.organization_id = :org_id OR vt.organization_id IS NULL)
                LIMIT 1
                """
            ),
            {"type_name": type_name, "org_id": org_id},
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
def get_vehicles(current_entity: dict = Depends(get_current_entity), db: Session = Depends(get_db)):
    org_id = current_entity.get("organization_id") if current_entity.get("role") == "user" else current_entity.get("id")
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
                WHERE vt.organization_id = :org_id OR vt.organization_id IS NULL
                ORDER BY vt.id ASC
                """
            ),
            {"org_id": org_id}
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
def create_vehicle(vehicle: VehicleCreate, current_entity: dict = Depends(get_current_entity), db: Session = Depends(get_db)):
    org_id = current_entity.get("organization_id") if current_entity.get("role") == "user" else current_entity.get("id")
    try:
        vt_id = db.execute(text("SELECT COALESCE(MAX(id), 0) + 1 FROM vehicle_types")).scalar() or 1
        vs_id = db.execute(text("SELECT COALESCE(MAX(id), 0) + 1 FROM vehicle_specs")).scalar() or 1
        
        db.execute(
            text(
                """
                INSERT INTO vehicle_types (id, name, count, is_active, created_at, organization_id)
                VALUES (:id, :name, :count, :is_active, NOW(), :org_id)
                """
            ),
            {
                "id": vt_id,
                "name": vehicle.name,
                "count": vehicle.quantity,
                "is_active": True,
                "org_id": org_id
            }
        )
        
        max_cbm = (vehicle.length_cm * vehicle.width_cm * vehicle.height_cm) / 1000000.0
        
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
def update_vehicle(vehicle_id: int, vehicle: VehicleUpdate, current_entity: dict = Depends(get_current_entity), db: Session = Depends(get_db)):
    org_id = current_entity.get("organization_id") if current_entity.get("role") == "user" else current_entity.get("id")
    try:
        exists = db.execute(
            text("SELECT 1 FROM vehicle_types WHERE id = :id AND organization_id = :org_id"),
            {"id": vehicle_id, "org_id": org_id}
        ).first()
        if not exists:
            raise HTTPException(status_code=404, detail="Vehicle not found or you do not have permission to modify it.")
            
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
        
        max_cbm = (vehicle.length_cm * vehicle.width_cm * vehicle.height_cm) / 1000000.0
        
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
def delete_vehicle(vehicle_id: int, current_entity: dict = Depends(get_current_entity), db: Session = Depends(get_db)):
    org_id = current_entity.get("organization_id") if current_entity.get("role") == "user" else current_entity.get("id")
    try:
        exists = db.execute(
            text("SELECT 1 FROM vehicle_types WHERE id = :id AND organization_id = :org_id"),
            {"id": vehicle_id, "org_id": org_id}
        ).first()
        if not exists:
            raise HTTPException(status_code=404, detail="Vehicle not found or you do not have permission to delete it.")
            
        db.execute(
            text("DELETE FROM vehicle_specs WHERE type_id = :type_id"),
            {"type_id": vehicle_id}
        )
        
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