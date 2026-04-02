from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class VehicleBase(BaseModel):
    name: str
    length_m: float  # Length in meters
    width_cm: float  # Width in centimeters
    height_cm: float  # Height in centimeters
    weight_kg: float  # Weight in kilograms
    max_weight_kg: float  # Maximum weight capacity in kilograms

class VehicleCreate(VehicleBase):
    pass

class VehicleUpdate(VehicleBase):
    pass

class VehicleResponse(VehicleBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True