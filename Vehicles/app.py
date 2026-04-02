from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from model.models import Vehicle, Base
from Schema.schemas import VehicleCreate, VehicleUpdate, VehicleResponse
from db_config.db import SessionLocal, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Vehicles API")

# Dependency (DB session)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

#  Create Vehicle
@app.post("/vehicles/", response_model=VehicleResponse)
def create_vehicle(vehicle: VehicleCreate, db: Session = Depends(get_db)):
    db_vehicle = Vehicle(**vehicle.dict())
    print("db_vehicle", db_vehicle.__dict__)
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

# Get All Vehicles
@app.get("/vehicles/", response_model=list[VehicleResponse])
def get_vehicles(db: Session = Depends(get_db)):
    return db.query(Vehicle).all()

# Get Single Vehicle
@app.get("/vehicles/{vehicle_id}", response_model=VehicleResponse)
def get_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle

# Update Vehicle
@app.put("/vehicles/{vehicle_id}", response_model=VehicleResponse)
def update_vehicle(vehicle_id: int, updated: VehicleUpdate, db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    for key, value in updated.dict().items():
        setattr(vehicle, key, value)
    db.commit()
    db.refresh(vehicle)
    return vehicle

# Delete Vehicle
@app.delete("/vehicles/{vehicle_id}")
def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    db.delete(vehicle)
    db.commit()
    return {"detail": "Vehicle deleted successfully"}