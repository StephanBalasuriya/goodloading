from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from db_config.db import Base


class VehicleType(Base):
    __tablename__ = "vehicle_types"

    id = Column(Integer, primary_key=True)
    organization_id = Column(UUID(as_uuid=True), nullable=True)
    name = Column(String, nullable=True)
    count = Column(Integer, nullable=True)
    is_active = Column(Boolean, nullable=True, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class VehicleSpec(Base):
    __tablename__ = "vehicle_specs"

    id = Column(Integer, primary_key=True)
    type_id = Column(Integer, ForeignKey("vehicle_types.id", ondelete="CASCADE"), nullable=True)
    max_cbm = Column(Float, nullable=True)
    max_weight_kg = Column(Integer, nullable=True)
    length_cm = Column(Float, nullable=True)
    width_cm = Column(Float, nullable=True)
    height_cm = Column(Float, nullable=True)
