from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, LargeBinary, Float, Enum, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
import enum
import pytz

# IST timezone helper
IST = pytz.timezone('Asia/Kolkata')
UTC = pytz.timezone('UTC')

def get_ist_now():
    """Get current IST time as naive datetime"""
    return datetime.now(IST).replace(tzinfo=None)

def get_utc_now():
    """Get current UTC time as naive datetime"""
    return datetime.now(UTC).replace(tzinfo=None)

class BagSize(Base):
    __tablename__ = "bag_sizes"
    id = Column(Integer, primary_key=True, index=True)
    weight_kg = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True)
    branch_id = Column(Integer, ForeignKey("branches.id"))
    created_at = Column(DateTime, default=get_utc_now)
    
    branch = relationship("Branch")
    order_items = relationship("OrderItem", back_populates="bag_size")

class Customer(Base):
    __tablename__ = "customers"
    customer_id = Column(Integer, primary_key=True, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    customer_name = Column(String(150), nullable=False)
    contact_person = Column(String(150))
    contact_person_mobile = Column(String(15))
    phone = Column(String(20))
    email = Column(String(150))
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    pin_code = Column(String(10))
    gst_number = Column(String(20))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=get_utc_now)
    # Removing updated_at temporarily to fix persistent DB error
    # updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    branch = relationship("Branch")
    orders = relationship("CustomerOrder", back_populates="customer")

class CustomerOrder(Base):
    __tablename__ = "customer_orders"
    order_id = Column(Integer, primary_key=True, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    order_code = Column(String(50), unique=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.customer_id"), nullable=False)
    order_status = Column(String(30), default='PENDING')
    order_date = Column(DateTime, default=get_utc_now)
    completed_time = Column(DateTime)
    remarks = Column(Text)

    branch = relationship("Branch")
    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    dispatches = relationship("Dispatch", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"
    order_item_id = Column(Integer, primary_key=True, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("customer_orders.order_id"), nullable=False)
    finished_good_id = Column(Integer, ForeignKey("finished_goods.id"), nullable=False)
    quantity_ton = Column(Float)
    price_per_ton = Column(Float)
    bag_size_id = Column(Integer, ForeignKey("bag_sizes.id"))
    number_of_bags = Column(Integer)
    price_per_bag = Column(Float)
    quantity_type = Column(String(10), default="ton") # "ton" or "bag"
    created_at = Column(DateTime, default=get_utc_now)

    branch = relationship("Branch")
    order = relationship("CustomerOrder", back_populates="items")
    finished_good = relationship("FinishedGood")
    bag_size = relationship("BagSize", back_populates="order_items")

class Driver(Base):
    __tablename__ = "drivers"
    driver_id = Column(Integer, primary_key=True, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    driver_name = Column(String(150), nullable=False)
    phone = Column(String(20))
    license_number = Column(String(50), unique=True)
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=get_utc_now)

    branch = relationship("Branch")
    dispatches = relationship("Dispatch", back_populates="driver")

class Dispatch(Base):
    __tablename__ = "dispatch"
    dispatch_id = Column(Integer, primary_key=True, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("customer_orders.order_id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.driver_id"), nullable=False)
    dispatched_quantity_ton = Column(Float, nullable=False)
    state = Column(String(100))
    city = Column(String(100))
    warehouse_loader = Column(String(150))
    actual_dispatch_date = Column(DateTime, nullable=False)
    delivery_date = Column(DateTime)
    status = Column(String(30), default='DISPATCHED')
    driver_photo = Column(Text)
    remarks = Column(Text)
    created_at = Column(DateTime, default=get_utc_now)

    branch = relationship("Branch")
    order = relationship("CustomerOrder", back_populates="dispatches")
    driver = relationship("Driver", back_populates="dispatches")

class HourlyProduction(Base):
    __tablename__ = "hourly_productions"
    id = Column(Integer, primary_key=True, index=True)
    production_order_id = Column(Integer, ForeignKey("production_orders.id"), nullable=False)
    production_date = Column(DateTime, nullable=False)
    production_time = Column(String(50), nullable=False)
    b1_scale_reading = Column(Float)
    load_per_hour_tons = Column(Float)
    reprocess = Column(Float)
    refraction = Column(Float)
    branch_id = Column(Integer, ForeignKey("branches.id"))
    created_at = Column(DateTime, default=get_utc_now)

    production_order = relationship("ProductionOrder")
    details = relationship("HourlyProductionDetail", back_populates="hourly_production")

class HourlyProductionDetail(Base):
    __tablename__ = "hourly_production_details"
    id = Column(Integer, primary_key=True, index=True)
    hourly_production_id = Column(Integer, ForeignKey("hourly_productions.id"), nullable=False)
    finished_good_id = Column(Integer, ForeignKey("finished_goods.id"), nullable=False)
    bag_size_id = Column(Integer, ForeignKey("bag_sizes.id"), nullable=False)
    quantity_bags = Column(Integer)

    hourly_production = relationship("HourlyProduction", back_populates="details")
    finished_good = relationship("FinishedGood")
    bag_size = relationship("BagSize")

class ClaimStatus(str, enum.Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    CLOSED = "Closed"

class ClaimType(str, enum.Enum):
    PERCENTAGE = "percentage"
    PER_KG = "per_kg"

class BinStatus(str, enum.Enum):
    ACTIVE = "Active"
    INACTIVE = "Inactive"
    MAINTENANCE = "Maintenance"
    FULL = "Full"

class TransferSessionStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    
    def __str__(self):
        return self.value

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    supplier_name = Column(String(255), nullable=False)
    contact_person = Column(String(255))
    phone = Column(String(20))
    address = Column(Text)
    street = Column(String(255))
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    zip_code = Column(String(20))
    gstin = Column(String(15))
    branch_id = Column(Integer, ForeignKey("branches.id"))
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    branch = relationship("Branch")
    vehicle_entries = relationship("VehicleEntry", back_populates="supplier")

class VehicleEntry(Base):
    __tablename__ = "vehicle_entries"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(String(50), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    bill_no = Column(String(100), nullable=False)
    driver_name = Column(String(255))
    driver_phone = Column(String(20))
    arrival_time = Column(DateTime, default=get_utc_now)
    empty_weight = Column(Float, default=0.0)
    gross_weight = Column(Float, default=0.0)
    supplier_bill_photo = Column(LargeBinary)
    vehicle_photo = Column(LargeBinary)
    vehicle_photo_front = Column(LargeBinary)
    vehicle_photo_back = Column(LargeBinary)
    vehicle_photo_side = Column(LargeBinary)
    internal_weighment_slip = Column(LargeBinary)
    client_weighment_slip = Column(LargeBinary)
    transportation_copy = Column(LargeBinary)
    notes = Column(Text)
    branch_id = Column(Integer, ForeignKey("branches.id"))
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    branch = relationship("Branch")
    supplier = relationship("Supplier", back_populates="vehicle_entries")
    lab_tests = relationship("LabTest", back_populates="vehicle_entry")

class LabTest(Base):
    __tablename__ = "lab_tests"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_entry_id = Column(Integer, ForeignKey("vehicle_entries.id"), nullable=False)
    test_date = Column(DateTime, default=get_utc_now)

    wheat_variety = Column(String(100))
    bill_number = Column(String(100))

    department = Column(String(50))
    moisture = Column(Float)
    test_weight = Column(Float)
    hectoliter_weight = Column(Float)
    protein_percent = Column(Float)
    wet_gluten = Column(Float)
    dry_gluten = Column(Float)
    sedimentation_value = Column(Float)
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
    other_grains = Column(Float)
    soft_wheat = Column(Float)
    heat_damaged = Column(Float)
    immature_wheat = Column(Float)
    broken_wheat = Column(Float)
    total_dockage = Column(Float)

    category = Column(String(50))
    remarks = Column(Text)
    comments_action = Column(Text)
    approved = Column(Boolean, default=False)
    tested_by = Column(String(255))
    raise_claim = Column(Integer, default=0)
    branch_id = Column(Integer, ForeignKey("branches.id"))

    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    branch = relationship("Branch")
    vehicle_entry = relationship("VehicleEntry", back_populates="lab_tests")
    claims = relationship("Claim", back_populates="lab_test")

class Claim(Base):
    __tablename__ = "claims"

    id = Column(Integer, primary_key=True, index=True)
    lab_test_id = Column(Integer, ForeignKey("lab_tests.id"), nullable=False)
    description = Column(Text, nullable=False)
    claim_type = Column(Enum(ClaimType), nullable=True)
    claim_amount = Column(Float, nullable=True)
    claim_status = Column(Enum(ClaimStatus), default=ClaimStatus.OPEN, nullable=False)
    claim_date = Column(DateTime, default=get_utc_now)
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    lab_test = relationship("LabTest", back_populates="claims")

class GodownMaster(Base):
    __tablename__ = "godown_master"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)
    current_storage = Column(Float, default=0.0)
    branch_id = Column(Integer, ForeignKey("branches.id"))
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    branch = relationship("Branch")
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

    unloading_start_time = Column(DateTime, default=get_utc_now)
    unloading_end_time = Column(DateTime, default=get_utc_now)
    notes = Column(Text)
    branch_id = Column(Integer, ForeignKey("branches.id"))

    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    branch = relationship("Branch")
    vehicle_entry = relationship("VehicleEntry")
    godown = relationship("GodownMaster", back_populates="unloading_entries")

class Bin(Base):
    __tablename__ = "bins"

    id = Column(Integer, primary_key=True, index=True)
    bin_number = Column(String(100), nullable=False, unique=True)
    capacity = Column(Float, nullable=False)
    current_quantity = Column(Float, default=0.0)
    material_type = Column(String(100))
    bin_type = Column(String(50))
    status = Column(String(20), default="Active", nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"))
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    branch = relationship("Branch")
    source_bins = relationship("ProductionOrderSourceBin", back_populates="bin", cascade="all, delete-orphan")
    destination_bins = relationship("ProductionOrderDestinationBin", back_populates="bin", cascade="all, delete-orphan")
    route_mappings_source = relationship("RouteMagnetMapping", foreign_keys="[RouteMagnetMapping.source_bin_id]", back_populates="source_bin", cascade="all, delete-orphan")
    route_mappings_dest = relationship("RouteMagnetMapping", foreign_keys="[RouteMagnetMapping.destination_bin_id]", back_populates="destination_bin", cascade="all, delete-orphan")
    transfers = relationship("BinTransfer", back_populates="bin", cascade="all, delete-orphan")
    transfer_sessions_dest = relationship("TransferSession", foreign_keys="[TransferSession.destination_bin_id]", back_populates="destination_bin", cascade="all, delete-orphan")
    transfer_sessions_current = relationship("TransferSession", foreign_keys="[TransferSession.current_bin_id]", back_populates="current_bin", cascade="all, delete-orphan")
    transfer_recording_dest = relationship("TransferRecording", back_populates="destination_bin", cascade="all, delete-orphan")
    transfer_12h_record_dest = relationship("Transfer12HourRecord", foreign_keys="[Transfer12HourRecord.destination_bin_id]", back_populates="destination_bin", cascade="all, delete-orphan")
    transfer_12h_record_source = relationship("Transfer12HourRecord", foreign_keys="[Transfer12HourRecord.source_bin_id]", back_populates="source_bin", cascade="all, delete-orphan")

class Magnet(Base):
    __tablename__ = "magnets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    status = Column(String(20), default="Active", nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"))
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    branch = relationship("Branch")

class Machine(Base):
    __tablename__ = "machines"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    machine_type = Column(String(50), nullable=False)
    make = Column(String(100))
    serial_number = Column(String(100))
    description = Column(Text)
    status = Column(String(20), default="Active", nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"))
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    branch = relationship("Branch")

class RouteMagnetMapping(Base):
    __tablename__ = "route_magnet_mappings"

    id = Column(Integer, primary_key=True, index=True)
    magnet_id = Column(Integer, ForeignKey("magnets.id"), nullable=False)
    source_godown_id = Column(Integer, ForeignKey("godown_master.id"), nullable=True)
    source_bin_id = Column(Integer, ForeignKey("bins.id"), nullable=True)
    destination_bin_id = Column(Integer, ForeignKey("bins.id"), nullable=False)
    cleaning_interval_hours = Column(Integer, default=3, nullable=False)
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    magnet = relationship("Magnet")
    source_godown = relationship("GodownMaster", foreign_keys=[source_godown_id])
    source_bin = relationship("Bin", foreign_keys=[source_bin_id], back_populates="route_mappings_source")
    destination_bin = relationship("Bin", foreign_keys=[destination_bin_id], back_populates="route_mappings_dest")

class RouteConfiguration(Base):
    __tablename__ = "route_configurations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    branch_id = Column(Integer, ForeignKey("branches.id"))
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    branch = relationship("Branch")
    stages = relationship("RouteStage", back_populates="route", cascade="all, delete-orphan", order_by="RouteStage.sequence_no")

class RouteStage(Base):
    __tablename__ = "route_stages"

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("route_configurations.id", ondelete="CASCADE"), nullable=False)
    sequence_no = Column(Integer, nullable=False)
    component_type = Column(String(20), nullable=False)
    component_id = Column(Integer, nullable=False)
    interval_hours = Column(Float, nullable=True)
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    route = relationship("RouteConfiguration", back_populates="stages")

class TransferSession(Base):
    __tablename__ = "transfer_sessions"

    id = Column(Integer, primary_key=True, index=True)
    source_godown_id = Column(Integer, ForeignKey("godown_master.id"), nullable=False)
    destination_bin_id = Column(Integer, ForeignKey("bins.id"), nullable=False)
    current_bin_id = Column(Integer, ForeignKey("bins.id"), nullable=True)
    magnet_id = Column(Integer, ForeignKey("magnets.id"), nullable=True)
    start_timestamp = Column(DateTime, default=get_utc_now, nullable=False)
    current_bin_start_timestamp = Column(DateTime, nullable=True)
    stop_timestamp = Column(DateTime, nullable=True)
    transferred_quantity = Column(Float, nullable=True)
    quantity_transferred = Column(Float, nullable=True)
    status = Column(String(20), default="active", nullable=False)
    cleaning_interval_hours = Column(Integer, default=3, nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    source_godown = relationship("GodownMaster", foreign_keys=[source_godown_id])
    destination_bin = relationship("Bin", foreign_keys=[destination_bin_id], back_populates="transfer_sessions_dest")
    current_bin = relationship("Bin", foreign_keys=[current_bin_id], back_populates="transfer_sessions_current")
    magnet = relationship("Magnet", foreign_keys=[magnet_id])
    cleaning_records = relationship("MagnetCleaningRecord", back_populates="transfer_session")
    bin_transfers = relationship("BinTransfer", back_populates="transfer_session", cascade="all, delete-orphan")
    session_magnets = relationship("TransferSessionMagnet", back_populates="transfer_session", cascade="all, delete-orphan")


class TransferSessionMagnet(Base):
    __tablename__ = "transfer_session_magnets"

    id = Column(Integer, primary_key=True, index=True)
    transfer_session_id = Column(Integer, ForeignKey("transfer_sessions.id", ondelete="CASCADE"), nullable=False)
    magnet_id = Column(Integer, ForeignKey("magnets.id"), nullable=False)
    cleaning_interval_hours = Column(Float, nullable=False)
    sequence_no = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    transfer_session = relationship("TransferSession", back_populates="session_magnets")
    magnet = relationship("Magnet")

class BinTransfer(Base):
    __tablename__ = "bin_transfers"

    id = Column(Integer, primary_key=True, index=True)
    transfer_session_id = Column(Integer, ForeignKey("transfer_sessions.id", ondelete="CASCADE"), nullable=False)
    bin_id = Column(Integer, ForeignKey("bins.id"), nullable=False)
    start_timestamp = Column(DateTime, nullable=False)
    end_timestamp = Column(DateTime, nullable=True)
    quantity = Column(Float, nullable=True)
    sequence = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    transfer_session = relationship("TransferSession", back_populates="bin_transfers")
    bin = relationship("Bin", back_populates="transfers")

class MagnetCleaningRecord(Base):
    __tablename__ = "magnet_cleaning_records"

    id = Column(Integer, primary_key=True, index=True)
    magnet_id = Column(Integer, ForeignKey("magnets.id", ondelete="CASCADE"), nullable=False, index=True)
    transfer_session_id = Column(Integer, ForeignKey("transfer_sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    cleaning_timestamp = Column(DateTime, default=get_utc_now, nullable=False)
    before_cleaning_photo = Column(String(500))
    after_cleaning_photo = Column(String(500))
    notes = Column(Text)
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    magnet = relationship("Magnet")
    transfer_session = relationship("TransferSession", back_populates="cleaning_records")

class WasteEntry(Base):
    __tablename__ = "waste_entries"

    id = Column(Integer, primary_key=True, index=True)
    transfer_session_id = Column(Integer, ForeignKey("transfer_sessions.id"), nullable=False, index=True)
    godown_id = Column(Integer, ForeignKey("godown_master.id"), nullable=False)
    waste_weight = Column(Float, nullable=False)
    waste_type = Column(String(100))
    recorded_timestamp = Column(DateTime, default=get_utc_now, nullable=False)
    recorded_by = Column(String(255))
    notes = Column(Text)
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    transfer_session = relationship("TransferSession")
    godown = relationship("GodownMaster")

class Branch(Base):
    __tablename__ = "branches"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text)
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    users = relationship("User", secondary="user_branches", back_populates="branches")

class UserBranch(Base):
    __tablename__ = "user_branches"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=get_utc_now)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), nullable=False, unique=True)
    email = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    branches = relationship("Branch", secondary="user_branches", back_populates="users")

class RawProduct(Base):
    __tablename__ = "raw_products"

    id = Column(Integer, primary_key=True, index=True)
    product_name = Column(String(255), nullable=False)
    product_initial = Column(String(10), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"))
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    branch = relationship("Branch")
    production_orders = relationship("ProductionOrder", back_populates="raw_product")

class FinishedGood(Base):
    __tablename__ = "finished_goods"

    id = Column(Integer, primary_key=True, index=True)
    product_name = Column(String(255), nullable=False)
    product_initial = Column(String(10), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"))
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    branch = relationship("Branch")

class ProductionOrderStatus(str, enum.Enum):
    CREATED = "CREATED"
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class ProductionOrder(Base):
    __tablename__ = "production_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(100), nullable=False, unique=True)
    raw_product_id = Column(Integer, ForeignKey("raw_products.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    order_date = Column(DateTime, default=get_utc_now)
    target_finish_date = Column(DateTime, nullable=False)
    status = Column(Enum(ProductionOrderStatus), default=ProductionOrderStatus.CREATED, nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"))
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    branch = relationship("Branch")
    raw_product = relationship("RawProduct", back_populates="production_orders")
    source_bins = relationship("ProductionOrderSourceBin", back_populates="production_order", cascade="all, delete-orphan")
    destination_bins = relationship("ProductionOrderDestinationBin", back_populates="production_order", cascade="all, delete-orphan")

class ProductionOrderSourceBin(Base):
    __tablename__ = "production_order_source_bins"

    id = Column(Integer, primary_key=True, index=True)
    production_order_id = Column(Integer, ForeignKey("production_orders.id"), nullable=False)
    bin_id = Column(Integer, ForeignKey("bins.id"), nullable=False)
    blend_percentage = Column(Float, nullable=False)
    quantity = Column(Float, nullable=False)
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    production_order = relationship("ProductionOrder", back_populates="source_bins")
    bin = relationship("Bin", back_populates="source_bins")

class ProductionOrderDestinationBin(Base):
    __tablename__ = "production_order_destination_bins"

    id = Column(Integer, primary_key=True, index=True)
    production_order_id = Column(Integer, ForeignKey("production_orders.id"), nullable=False)
    bin_id = Column(Integer, ForeignKey("bins.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    production_order = relationship("ProductionOrder", back_populates="destination_bins")
    bin = relationship("Bin", back_populates="destination_bins")

class TransferRecordingStatus(str, enum.Enum):
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"

    def __str__(self):
        return str(self.value)

    def __repr__(self):
        return str(self.value)

# Update the column definitions to use String if Enum is failing
# search for the columns and ensure they use a fallback or explicit string cast if needed

class TransferRecording(Base):
    __tablename__ = "24hours_transfer_records"

    id = Column(Integer, primary_key=True, index=True)
    production_order_id = Column(Integer, ForeignKey("production_orders.id"), nullable=False)
    destination_bin_id = Column(Integer, ForeignKey("bins.id"), nullable=False)
    status = Column(String(50), default="PLANNED", nullable=False)
    quantity_planned = Column(Float, nullable=False, default=0.0)
    quantity_transferred = Column(Float, default=0.0)
    transfer_start_time = Column(DateTime)
    transfer_end_time = Column(DateTime)
    duration_minutes = Column(Integer)
    water_added = Column(Float)
    moisture_level = Column(Float)
    branch_id = Column(Integer, ForeignKey("branches.id"))
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)
    created_by = Column(Integer, ForeignKey("users.id"))
    updated_by = Column(Integer, ForeignKey("users.id"))

    production_order = relationship("ProductionOrder")
    destination_bin = relationship("Bin", foreign_keys=[destination_bin_id], back_populates="transfer_recording_dest")
    created_by_user = relationship("User", foreign_keys=[created_by])
    updated_by_user = relationship("User", foreign_keys=[updated_by])


# ============================================================================
# 12-Hour Transfer Models (Simplified)
# ============================================================================

class Transfer12HourRecord(Base):
    __tablename__ = "12hours_transfer_records"

    id = Column(Integer, primary_key=True, index=True)
    source_bin_id = Column(Integer, ForeignKey("bins.id"), nullable=False)
    destination_bin_id = Column(Integer, ForeignKey("bins.id"), nullable=False)
    quantity_transferred = Column(Float, nullable=False, default=0.0)
    status = Column(String(50), default="PLANNED", nullable=False, index=True)
    water_added = Column(Float)
    moisture_level = Column(Float)
    transfer_start_time = Column(DateTime)
    transfer_end_time = Column(DateTime)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now, nullable=False)
    transfer_type = Column(String(50))
    branch_id = Column(Integer, ForeignKey("branches.id"))
    production_order_id = Column(Integer, ForeignKey("production_orders.id"), nullable=False)

    source_bin = relationship("Bin", foreign_keys=[source_bin_id], back_populates="transfer_12h_record_source")
    destination_bin = relationship("Bin", foreign_keys=[destination_bin_id], back_populates="transfer_12h_record_dest")
    created_by_user = relationship("User", foreign_keys=[created_by])
    branch = relationship("Branch")
    production_order = relationship("ProductionOrder")
