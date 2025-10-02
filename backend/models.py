from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, LargeBinary, Float, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="user")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Supplier(Base):
    __tablename__ = "suppliers"
    
    id = Column(Integer, primary_key=True, index=True)
    supplier_name = Column(String(255), nullable=False)
    contact_person = Column(String(255))
    phone = Column(String(20))
    address = Column(Text)
    state = Column(String(100), nullable=False)
    city = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    vehicle_entries = relationship("VehicleEntry", back_populates="supplier")

class VehicleEntry(Base):
    __tablename__ = "vehicle_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(String(50), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    bill_no = Column(String(100), nullable=False)
    driver_name = Column(String(255))
    driver_phone = Column(String(20))
    arrival_time = Column(DateTime, default=datetime.utcnow)
    supplier_bill_photo = Column(LargeBinary)
    vehicle_photo = Column(LargeBinary)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    supplier = relationship("Supplier", back_populates="vehicle_entries")
    lab_tests = relationship("LabTest", back_populates="vehicle_entry")

class LabTest(Base):
    __tablename__ = "lab_tests"
    
    id = Column(Integer, primary_key=True, index=True)
    vehicle_entry_id = Column(Integer, ForeignKey("vehicle_entries.id"), nullable=False)
    test_date = Column(DateTime, default=datetime.utcnow)
    
    moisture = Column(Float)
    test_weight = Column(Float)
    protein_percent = Column(Float)
    wet_gluten = Column(Float)
    dry_gluten = Column(Float)
    falling_number = Column(Integer)
    
    chaff_husk = Column(Float)
    straws_sticks = Column(Float)
    other_foreign_matter = Column(Float)
    mudballs = Column(Float)
    stones = Column(Float)
    dust_sand = Column(Float)
    total_impurities = Column(Float)
    
    shriveled_wheat = Column(Float)
    insect_damage = Column(Float)
    blackened_wheat = Column(Float)
    sprouted_grains = Column(Float)
    other_grain_damage = Column(Float)
    total_dockage = Column(Float)
    
    remarks = Column(Text)
    tested_by = Column(String(255))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    vehicle_entry = relationship("VehicleEntry", back_populates="lab_tests")
