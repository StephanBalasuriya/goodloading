from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class VehicleBase(BaseModel):
    name: str
    length_cm: float
    width_cm: float
    height_cm: float
    max_weight_kg: float
    quantity: int = 1


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


class GmproUsedVehicle(BaseModel):
    gmpro_vehicle_label: str
    gmpro_vehicle_type: str
    type_id: int
    type_name: str
    count: int
    is_active: bool
    length_cm: float
    width_cm: float
    height_cm: float
    max_weight_kg: float
    max_cbm: float
