from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, LargeBinary, Float, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
import enum
import pytz

# IST timezone helper
IST = pytz.timezone('Asia/Kolkata')

def get_ist_now():
    """Get current IST time as naive datetime"""
    return datetime.now(IST).replace(tzinfo=None)

class ClaimStatus(str, enum.Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    CLOSED = "Closed"

class BinStatus(str, enum.Enum):
    ACTIVE = "Active"
    INACTIVE = "Inactive"
    MAINTENANCE = "Maintenance"
    FULL = "Full"

class TransferSessionStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class Supplier(Base):
    __tablename__ = "suppliers"
    
    id = Column(Integer, primary_key=True, index=True)
    supplier_name = Column(String(255), nullable=False)
    contact_person = Column(String(255))
    phone = Column(String(20))
    address = Column(Text)
    state = Column(String(100), nullable=False)
    city = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=get_ist_now)
    updated_at = Column(DateTime, default=get_ist_now, onupdate=get_ist_now)
    
    vehicle_entries = relationship("VehicleEntry", back_populates="supplier")

class VehicleEntry(Base):
    __tablename__ = "vehicle_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(String(50), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    bill_no = Column(String(100), nullable=False)
    driver_name = Column(String(255))
    driver_phone = Column(String(20))
    arrival_time = Column(DateTime, default=get_ist_now)
    supplier_bill_photo = Column(LargeBinary)
    vehicle_photo = Column(LargeBinary)
    notes = Column(Text)
    created_at = Column(DateTime, default=get_ist_now)
    updated_at = Column(DateTime, default=get_ist_now, onupdate=get_ist_now)
    
    supplier = relationship("Supplier", back_populates="vehicle_entries")
    lab_tests = relationship("LabTest", back_populates="vehicle_entry")

class LabTest(Base):
    __tablename__ = "lab_tests"
    
    id = Column(Integer, primary_key=True, index=True)
    vehicle_entry_id = Column(Integer, ForeignKey("vehicle_entries.id"), nullable=False)
    test_date = Column(DateTime, default=get_ist_now)
    
    # Document fields
    document_no = Column(String(50))
    issue_no = Column(String(10), default="01")
    issue_date = Column(DateTime, default=get_ist_now)
    department = Column(String(50), default="QA")
    wheat_variety = Column(String(100))
    bill_number = Column(String(100))
    
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
    
    created_at = Column(DateTime, default=get_ist_now)
    updated_at = Column(DateTime, default=get_ist_now, onupdate=get_ist_now)
    
    vehicle_entry = relationship("VehicleEntry", back_populates="lab_tests")
    claims = relationship("Claim", back_populates="lab_test")

class Claim(Base):
    __tablename__ = "claims"
    
    id = Column(Integer, primary_key=True, index=True)
    lab_test_id = Column(Integer, ForeignKey("lab_tests.id"), nullable=False)
    issue_found = Column(Text, nullable=False)
    category_detected = Column(String(100))
    claim_status = Column(Enum(ClaimStatus), default=ClaimStatus.OPEN, nullable=False)
    claim_date = Column(DateTime, default=get_ist_now)
    remarks = Column(Text)
    created_at = Column(DateTime, default=get_ist_now)
    updated_at = Column(DateTime, default=get_ist_now, onupdate=get_ist_now)
    
    lab_test = relationship("LabTest", back_populates="claims")

class GodownMaster(Base):
    __tablename__ = "godown_master"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    capacity = Column(Integer, nullable=False)
    type = Column(String(50), nullable=False)
    current_storage = Column(Float, default=0.0)
    created_at = Column(DateTime, default=get_ist_now)
    updated_at = Column(DateTime, default=get_ist_now, onupdate=get_ist_now)
    
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
    
    unloading_start_time = Column(DateTime, default=get_ist_now)
    unloading_end_time = Column(DateTime, default=get_ist_now)
    notes = Column(Text)
    
    created_at = Column(DateTime, default=get_ist_now)
    updated_at = Column(DateTime, default=get_ist_now, onupdate=get_ist_now)
    
    vehicle_entry = relationship("VehicleEntry")
    godown = relationship("GodownMaster", back_populates="unloading_entries")

class Bin(Base):
    __tablename__ = "bins"
    
    id = Column(Integer, primary_key=True, index=True)
    bin_number = Column(String(100), nullable=False, unique=True)
    capacity = Column(Float, nullable=False)
    current_quantity = Column(Float, default=0.0)
    material_type = Column(String(100))
    status = Column(Enum(BinStatus), default=BinStatus.ACTIVE, nullable=False)
    created_at = Column(DateTime, default=get_ist_now)
    updated_at = Column(DateTime, default=get_ist_now, onupdate=get_ist_now)

class Magnet(Base):
    __tablename__ = "magnets"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    status = Column(Enum(BinStatus), default=BinStatus.ACTIVE, nullable=False)
    created_at = Column(DateTime, default=get_ist_now)
    updated_at = Column(DateTime, default=get_ist_now, onupdate=get_ist_now)

class RouteMagnetMapping(Base):
    __tablename__ = "route_magnet_mappings"
    
    id = Column(Integer, primary_key=True, index=True)
    magnet_id = Column(Integer, ForeignKey("magnets.id"), nullable=False)
    source_godown_id = Column(Integer, ForeignKey("godown_master.id"), nullable=True)
    source_bin_id = Column(Integer, ForeignKey("bins.id"), nullable=True)
    destination_bin_id = Column(Integer, ForeignKey("bins.id"), nullable=False)
    cleaning_interval_hours = Column(Integer, default=3, nullable=False)
    created_at = Column(DateTime, default=get_ist_now)
    updated_at = Column(DateTime, default=get_ist_now, onupdate=get_ist_now)
    
    magnet = relationship("Magnet")
    source_godown = relationship("GodownMaster", foreign_keys=[source_godown_id])
    source_bin = relationship("Bin", foreign_keys=[source_bin_id])
    destination_bin = relationship("Bin", foreign_keys=[destination_bin_id])

class TransferSession(Base):
    __tablename__ = "transfer_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    source_godown_id = Column(Integer, ForeignKey("godown_master.id"), nullable=False)
    destination_bin_id = Column(Integer, ForeignKey("bins.id"), nullable=False)
    magnet_id = Column(Integer, ForeignKey("magnets.id"), nullable=True)
    start_timestamp = Column(DateTime, default=get_ist_now, nullable=False)
    stop_timestamp = Column(DateTime, nullable=True)
    transferred_quantity = Column(Float, nullable=True)
    status = Column(Enum(TransferSessionStatus), default=TransferSessionStatus.ACTIVE, nullable=False)
    cleaning_interval_hours = Column(Integer, default=3, nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime, default=get_ist_now)
    updated_at = Column(DateTime, default=get_ist_now, onupdate=get_ist_now)
    
    source_godown = relationship("GodownMaster", foreign_keys=[source_godown_id])
    destination_bin = relationship("Bin", foreign_keys=[destination_bin_id])
    magnet = relationship("Magnet", foreign_keys=[magnet_id])
    cleaning_records = relationship("MagnetCleaningRecord", back_populates="transfer_session")

class MagnetCleaningRecord(Base):
    __tablename__ = "magnet_cleaning_records"
    
    id = Column(Integer, primary_key=True, index=True)
    magnet_id = Column(Integer, ForeignKey("magnets.id", ondelete="CASCADE"), nullable=False, index=True)
    transfer_session_id = Column(Integer, ForeignKey("transfer_sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    cleaning_timestamp = Column(DateTime, default=get_ist_now, nullable=False)
    before_cleaning_photo = Column(String(500))
    after_cleaning_photo = Column(String(500))
    notes = Column(Text)
    created_at = Column(DateTime, default=get_ist_now)
    updated_at = Column(DateTime, default=get_ist_now, onupdate=get_ist_now)
    
    magnet = relationship("Magnet")
    transfer_session = relationship("TransferSession", back_populates="cleaning_records")
