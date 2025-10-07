from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, LargeBinary, Float, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
import enum

class ClaimStatus(str, enum.Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    CLOSED = "Closed"

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
    
    category = Column(String(50))
    remarks = Column(Text)
    tested_by = Column(String(255))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    vehicle_entry = relationship("VehicleEntry", back_populates="lab_tests")
    claims = relationship("Claim", back_populates="lab_test")

class Claim(Base):
    __tablename__ = "claims"
    
    id = Column(Integer, primary_key=True, index=True)
    lab_test_id = Column(Integer, ForeignKey("lab_tests.id"), nullable=False)
    issue_found = Column(Text, nullable=False)
    category_detected = Column(String(100))
    claim_status = Column(Enum(ClaimStatus), default=ClaimStatus.OPEN, nullable=False)
    claim_date = Column(DateTime, default=datetime.utcnow)
    remarks = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    lab_test = relationship("LabTest", back_populates="claims")

class GodownMaster(Base):
    __tablename__ = "godown_master"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    capacity = Column(Integer, nullable=False)
    type = Column(String(50), nullable=False)
    current_storage = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    unloading_entries = relationship("UnloadingEntry", back_populates="godown")

class UnloadingEntry(Base):
    __tablename__ = "unloading_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    vehicle_entry_id = Column(Integer, ForeignKey("vehicle_entries.id"), nullable=False)
    godown_id = Column(Integer, ForeignKey("godown_master.id"), nullable=False)
    
    gross_weight = Column(Float, nullable=False)
    empty_vehicle_weight = Column(Float, nullable=False)
    net_weight = Column(Float, nullable=False)
    
    before_unloading_image = Column(String(500))
    after_unloading_image = Column(String(500))
    
    unloading_start_time = Column(DateTime, default=datetime.utcnow)
    unloading_end_time = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    vehicle_entry = relationship("VehicleEntry")
    godown = relationship("GodownMaster", back_populates="unloading_entries")
