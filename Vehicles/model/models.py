from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from db_config.db import Base

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    length_cm = Column(Float, nullable=False)  # Length in meters
    width_cm = Column(Float, nullable=False)  # Width in centimeters
    height_cm = Column(Float, nullable=False)  # Height in centimeters
    max_weight_kg = Column(Float, nullable=False)  # Maximum weight capacity in kilograms
    quantity = Column(Integer, nullable=False, default=1)  # Number of identical vehicles
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)