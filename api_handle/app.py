import os
import re

import uvicorn
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from db_config.db import SessionLocal
from Schema.schemas import GmproUsedVehicle
from services.gmpro_cache import get_valid_gmpro_response
from services.goodloading_service import calculate_loading, map_loading, recommend_loading
from services.gmpro_service import get_gmpro_response, handle_gmpro_response

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


if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8001")),
        reload=os.getenv("RELOAD", "true").lower() == "true",
    )