from pydantic import BaseModel, validator
from datetime import datetime
from typing import Optional, List
from enum import Enum
from utils.datetime_utils import format_ist_iso, parse_datetime

class ISTModel(BaseModel):
    """Base model with IST datetime serialization"""
    class Config:
        json_encoders = {datetime: format_ist_iso}
        from_attributes = True

class SiloMasterBase(ISTModel):
    bin_no: str
    silo_name: str
    capacity_kg: float
    current_stock_kg: Optional[float] = 0.0
    current_moisture_percent: Optional[float] = None
    status: str = 'Active'
    last_cleaning_date: Optional[datetime] = None
    remarks: Optional[str] = None
    branch_id: Optional[int] = None

    @validator('last_cleaning_date', pre=True)
    def _parse_last_cleaning_date(cls, v):
        return parse_datetime(v)

class SiloMasterCreate(SiloMasterBase):
    pass

class SiloMasterUpdate(ISTModel):
    bin_no: Optional[str] = None
    silo_name: Optional[str] = None
    capacity_kg: Optional[float] = None
    current_stock_kg: Optional[float] = None
    current_moisture_percent: Optional[float] = None
    status: Optional[str] = None
    last_cleaning_date: Optional[datetime] = None
    remarks: Optional[str] = None
    branch_id: Optional[int] = None

    @validator('last_cleaning_date', pre=True)
    def _parse_last_cleaning_date(cls, v):
        return parse_datetime(v)

class SiloMaster(SiloMasterBase):
    silo_id: int
    created_at: datetime
    updated_at: datetime
    branch_id: Optional[int] = None

class ClaimStatusEnum(str, Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    CLOSED = "Closed"

class ClaimTypeEnum(str, Enum):
    PERCENTAGE = "percentage"
    PER_KG = "per_kg"

class BinStatusEnum(str, Enum):
    ACTIVE = "Active"
    INACTIVE = "Inactive"
    MAINTENANCE = "Maintenance"
    FULL = "Full"

class TransferSessionStatusEnum(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class TransferRecordingStatusEnum(str, Enum):
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    DIVERTED = "DIVERTED"

# 12-Hour Transfer Schemas (Simplified)
class Transfer12HourRecordBase(ISTModel):
    source_bin_id: int
    destination_bin_id: int
    quantity_transferred: float = 0.0
    production_order_id: int
    transfer_type: Optional[str] = "NORMAL"

class Transfer12HourRecordCreate(Transfer12HourRecordBase):
    water_added: Optional[float] = None
    moisture_level: Optional[float] = None
    transfer_start_time: Optional[datetime] = None
    status: Optional[str] = "PLANNED"
    branch_id: Optional[int] = None

class Transfer12HourRecordUpdate(BaseModel):
    quantity_transferred: Optional[float] = None
    status: Optional[str] = None
    water_added: Optional[float] = None
    moisture_level: Optional[float] = None
    transfer_end_time: Optional[datetime] = None

class Transfer12HourRecord(Transfer12HourRecordBase):
    id: int
    status: str
    water_added: Optional[float] = None
    moisture_level: Optional[float] = None
    transfer_start_time: Optional[datetime] = None
    transfer_end_time: Optional[datetime] = None
    created_by: Optional[int] = None
    branch_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

class BagSizeBase(ISTModel):
    weight_kg: int
    is_active: bool = True

class BagSizeCreate(BagSizeBase):
    branch_id: Optional[int] = None

class BagSize(BagSizeBase):
    id: int
    branch_id: Optional[int] = None
    created_at: datetime

class HourlyProductionDetailBase(BaseModel):
    finished_good_id: int
    bag_size_id: int
    quantity_bags: int

class HourlyProductionDetailCreate(HourlyProductionDetailBase):
    pass

class HourlyProductionDetail(HourlyProductionDetailBase):
    id: int
    hourly_production_id: int

class HourlyProductionSiloBase(BaseModel):
    finished_good_id: int
    silo_id: int
    quantity_kg: float
    moisture_percent: Optional[float] = None

class HourlyProductionSiloCreate(HourlyProductionSiloBase):
    pass

class HourlyProductionSilo(HourlyProductionSiloBase):
    id: int
    hourly_production_id: int
    created_at: datetime

class HourlyProductionBase(ISTModel):
    production_order_id: int
    production_date: datetime
    production_time: str
    b1_scale_reading: Optional[float] = 0.0
    load_per_hour_tons: Optional[float] = 0.0
    reprocess: Optional[float] = 0.0
    refraction: Optional[float] = 0.0

    @validator('production_date', pre=True)
    def _parse_production_date(cls, v):
        return parse_datetime(v)

class HourlyProductionCreate(HourlyProductionBase):
    branch_id: Optional[int] = None
    details: List[HourlyProductionDetailCreate]
    silo_details: Optional[List[HourlyProductionSiloCreate]] = []

class HourlyProduction(HourlyProductionBase):
    id: int
    branch_id: Optional[int] = None
    created_at: datetime
    details: List[HourlyProductionDetail] = []
    silo_details: List[HourlyProductionSilo] = []

class SupplierBase(ISTModel):
    supplier_name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    street: Optional[str] = None
    city: str
    state: str
    zip_code: Optional[str] = None
    gstin: Optional[str] = None

class SupplierCreate(SupplierBase):
    branch_id: Optional[int] = None

class SupplierUpdate(SupplierBase):
    pass

class Supplier(SupplierBase):
    id: int
    branch_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

class VehicleEntryBase(ISTModel):
    vehicle_number: str
    supplier_id: int
    bill_no: str
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    arrival_time: Optional[datetime] = None
    empty_weight: Optional[float] = 0.0
    gross_weight: Optional[float] = 0.0
    notes: Optional[str] = None

    @validator('arrival_time', pre=True)
    def _parse_arrival_time(cls, v):
        return parse_datetime(v)

class VehicleEntryCreate(VehicleEntryBase):
    branch_id: Optional[int] = None

class VehicleEntry(VehicleEntryBase):
    id: int
    branch_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    supplier_bill_photo: Optional[str] = None
    vehicle_photo: Optional[str] = None
    vehicle_photo_front: Optional[str] = None
    vehicle_photo_back: Optional[str] = None
    vehicle_photo_side: Optional[str] = None
    internal_weighment_slip: Optional[str] = None
    client_weighment_slip: Optional[str] = None
    transportation_copy: Optional[str] = None

class VehicleEntryWithSupplier(VehicleEntry):
    supplier: Supplier

class VehicleEntryWithLabTests(VehicleEntry):
    supplier: Supplier
    lab_tests: list['LabTest'] = []

class LabTestBase(ISTModel):
    vehicle_entry_id: int
    test_date: Optional[datetime] = None
    wheat_variety: Optional[str] = None
    bill_number: Optional[str] = None
    moisture: Optional[float] = None
    test_weight: Optional[float] = None
    protein_percent: Optional[float] = None
    wet_gluten: Optional[float] = None
    dry_gluten: Optional[float] = None
    falling_number: Optional[int] = None
    chaff_husk: Optional[float] = None
    straws_sticks: Optional[float] = None
    other_foreign_matter: Optional[float] = None
    mudballs: Optional[float] = None
    stones: Optional[float] = None
    dust_sand: Optional[float] = None
    total_impurities: Optional[float] = None
    shriveled_wheat: Optional[float] = None
    insect_damage: Optional[float] = None
    blackened_wheat: Optional[float] = None
    sprouted_grains: Optional[float] = None
    other_grain_damage: Optional[float] = None
    total_dockage: Optional[float] = None
    category: Optional[str] = None
    remarks: Optional[str] = None
    tested_by: Optional[str] = None
    raise_claim: Optional[int] = 0  # 0 = No, 1 = Yes

    @validator('test_date', pre=True)
    def _parse_dates(cls, v):
        return parse_datetime(v)

class LabTestCreate(LabTestBase):
    branch_id: Optional[int] = None

class LabTest(LabTestBase):
    id: int
    branch_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

class LabTestWithVehicle(LabTest):
    vehicle_entry: VehicleEntryWithSupplier
    has_claim: bool = False

class ClaimBase(ISTModel):
    lab_test_id: int
    description: str
    claim_type: Optional[ClaimTypeEnum] = None
    claim_amount: Optional[float] = None
    claim_date: Optional[datetime] = None

    @validator('claim_date', pre=True)
    def _parse_claim_date(cls, v):
        return parse_datetime(v)

class ClaimCreate(ClaimBase):
    pass

class ClaimUpdate(ISTModel):
    claim_status: Optional[ClaimStatusEnum] = None
    description: Optional[str] = None
    claim_type: Optional[ClaimTypeEnum] = None
    claim_amount: Optional[float] = None

class Claim(ClaimBase):
    id: int
    claim_status: ClaimStatusEnum
    created_at: datetime
    updated_at: datetime

class ClaimWithLabTest(Claim):
    lab_test: LabTestWithVehicle

class GodownMasterBase(ISTModel):
    name: str
    type: str

class GodownMasterCreate(GodownMasterBase):
    current_storage: Optional[float] = 0.0
    branch_id: Optional[int] = None

class GodownMasterUpdate(GodownMasterBase):
    current_storage: Optional[float] = None

class GodownMaster(GodownMasterBase):
    id: int
    branch_id: Optional[int] = None
    current_storage: float
    created_at: datetime
    updated_at: datetime

class UnloadingEntryBase(ISTModel):
    vehicle_entry_id: int
    godown_id: int
    gross_weight: float
    empty_vehicle_weight: float
    net_weight: float
    unloading_start_time: Optional[datetime] = None
    unloading_end_time: Optional[datetime] = None
    notes: Optional[str] = None

    @validator('unloading_start_time', 'unloading_end_time', pre=True)
    def _parse_unloading_times(cls, v):
        return parse_datetime(v)

class UnloadingEntryCreate(UnloadingEntryBase):
    branch_id: Optional[int] = None

class UnloadingEntry(UnloadingEntryBase):
    id: int
    branch_id: Optional[int] = None
    before_unloading_image: Optional[str] = None
    after_unloading_image: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class UnloadingEntryWithDetails(UnloadingEntry):
    vehicle_entry: VehicleEntryWithSupplier
    godown: GodownMaster

class BinBase(ISTModel):
    bin_number: str
    capacity: float
    current_quantity: Optional[float] = 0.0
    material_type: Optional[str] = None
    bin_type: Optional[str] = None
    status: BinStatusEnum = BinStatusEnum.ACTIVE

class BinCreate(BinBase):
    branch_id: Optional[int] = None

class BinUpdate(ISTModel):
    bin_number: Optional[str] = None
    capacity: Optional[float] = None
    current_quantity: Optional[float] = None
    material_type: Optional[str] = None
    bin_type: Optional[str] = None
    status: Optional[BinStatusEnum] = None

class Bin(BinBase):
    id: int
    branch_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

class MagnetBase(ISTModel):
    name: str
    description: Optional[str] = None
    status: BinStatusEnum = BinStatusEnum.ACTIVE

class MagnetCreate(MagnetBase):
    branch_id: Optional[int] = None

class MagnetUpdate(ISTModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[BinStatusEnum] = None

class Magnet(MagnetBase):
    id: int
    branch_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

class MachineBase(ISTModel):
    name: str
    machine_type: str
    make: Optional[str] = None
    serial_number: Optional[str] = None
    description: Optional[str] = None
    status: str = "Active"

class MachineCreate(MachineBase):
    branch_id: Optional[int] = None

class MachineUpdate(ISTModel):
    name: Optional[str] = None
    machine_type: Optional[str] = None
    make: Optional[str] = None
    serial_number: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

class Machine(MachineBase):
    id: int
    branch_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

class RouteMagnetMappingBase(ISTModel):
    magnet_id: int
    source_godown_id: Optional[int] = None
    source_bin_id: Optional[int] = None
    destination_bin_id: int
    cleaning_interval_hours: int = 3

class RouteMagnetMappingCreate(RouteMagnetMappingBase):
    pass

class RouteMagnetMappingUpdate(ISTModel):
    magnet_id: Optional[int] = None
    source_godown_id: Optional[int] = None
    source_bin_id: Optional[int] = None
    destination_bin_id: Optional[int] = None
    cleaning_interval_hours: Optional[int] = None

class RouteMagnetMapping(RouteMagnetMappingBase):
    id: int
    created_at: datetime
    updated_at: datetime

class RouteMagnetMappingWithDetails(RouteMagnetMapping):
    magnet: Magnet
    source_godown: Optional[GodownMaster] = None
    source_bin: Optional[Bin] = None
    destination_bin: Bin

class RouteStageBase(ISTModel):
    sequence_no: int
    component_type: str
    component_id: int
    interval_hours: Optional[float] = None

class RouteStageCreate(RouteStageBase):
    pass

class RouteStage(RouteStageBase):
    id: int
    route_id: int
    created_at: datetime
    updated_at: datetime

class RouteConfigurationBase(ISTModel):
    name: str
    description: Optional[str] = None

class RouteConfigurationCreate(RouteConfigurationBase):
    branch_id: Optional[int] = None
    stages: list[RouteStageCreate]

class RouteConfigurationUpdate(ISTModel):
    name: Optional[str] = None
    description: Optional[str] = None
    stages: Optional[list[RouteStageCreate]] = None

class RouteConfiguration(RouteConfigurationBase):
    id: int
    branch_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    stages: list[RouteStage] = []

class BinTransferBase(ISTModel):
    bin_id: int
    start_timestamp: datetime
    end_timestamp: Optional[datetime] = None
    quantity: Optional[float] = None
    sequence: int

    @validator('start_timestamp', 'end_timestamp', pre=True)
    def _parse_timestamps(cls, v):
        return parse_datetime(v)

class BinTransfer(BinTransferBase):
    id: int
    transfer_session_id: int
    created_at: datetime
    updated_at: datetime

class BinTransferWithBin(BinTransfer):
    bin: Bin

class TransferSessionMagnetBase(ISTModel):
    magnet_id: int
    cleaning_interval_hours: float
    sequence_no: int

class TransferSessionMagnet(TransferSessionMagnetBase):
    id: int
    transfer_session_id: int
    created_at: datetime
    updated_at: datetime

class TransferSessionMagnetWithDetails(TransferSessionMagnet):
    magnet: Magnet

class TransferSessionBase(ISTModel):
    source_godown_id: int
    destination_bin_id: int
    magnet_id: Optional[int] = None
    notes: Optional[str] = None

class TransferSessionCreate(BaseModel):
    source_godown_id: int
    destination_bin_id: int
    magnet_id: Optional[int] = None
    cleaning_interval_hours: Optional[int] = None
    notes: Optional[str] = None

class TransferSessionDivert(ISTModel):
    new_bin_id: int
    quantity_transferred: float

class TransferSessionComplete(ISTModel):
    water_added: float
    moisture_level: float
    quantity_transferred: float

class TransferSessionUpdate(ISTModel):
    transferred_quantity: Optional[float] = None
    status: Optional[TransferSessionStatusEnum] = None
    notes: Optional[str] = None

class TransferSession(TransferSessionBase):
    id: int
    current_bin_id: Optional[int] = None
    start_timestamp: datetime
    current_bin_start_timestamp: Optional[datetime] = None
    stop_timestamp: Optional[datetime] = None
    transferred_quantity: Optional[float] = None
    status: TransferSessionStatusEnum
    cleaning_interval_hours: int
    created_at: datetime
    updated_at: datetime

class TransferSessionWithDetails(TransferSession):
    source_godown: GodownMaster
    destination_bin: Bin
    current_bin: Optional[Bin] = None
    magnet: Optional[Magnet] = None
    cleaning_records: list['MagnetCleaningRecord'] = []
    bin_transfers: list['BinTransferWithBin'] = []
    session_magnets: list['TransferSessionMagnetWithDetails'] = []

class MagnetCleaningRecordBase(ISTModel):
    magnet_id: int
    transfer_session_id: Optional[int] = None
    cleaning_timestamp: Optional[datetime] = None
    notes: Optional[str] = None

    @validator('cleaning_timestamp', pre=True)
    def _parse_cleaning_timestamp(cls, v):
        return parse_datetime(v)

class MagnetCleaningRecordCreate(MagnetCleaningRecordBase):
    pass

class MagnetCleaningRecordUpdate(ISTModel):
    magnet_id: Optional[int] = None
    transfer_session_id: Optional[int] = None
    cleaning_timestamp: Optional[datetime] = None
    notes: Optional[str] = None

    @validator('cleaning_timestamp', pre=True)
    def _parse_cleaning_timestamp(cls, v):
        return parse_datetime(v)

class MagnetCleaningRecord(MagnetCleaningRecordBase):
    id: int
    before_cleaning_photo: Optional[str] = None
    after_cleaning_photo: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class MagnetCleaningRecordWithDetails(MagnetCleaningRecord):
    magnet: Magnet
    transfer_session: Optional[TransferSession] = None

class WasteEntryBase(ISTModel):
    transfer_session_id: int
    godown_id: int
    waste_weight: float
    waste_type: Optional[str] = None
    recorded_timestamp: Optional[datetime] = None
    recorded_by: Optional[str] = None
    notes: Optional[str] = None

    @validator('recorded_timestamp', pre=True)
    def _parse_recorded_timestamp(cls, v):
        return parse_datetime(v)

class WasteEntryCreate(WasteEntryBase):
    pass

class WasteEntryUpdate(ISTModel):
    waste_weight: Optional[float] = None
    waste_type: Optional[str] = None
    recorded_by: Optional[str] = None
    notes: Optional[str] = None

class WasteEntry(WasteEntryBase):
    id: int
    created_at: datetime
    updated_at: datetime

class WasteEntryWithDetails(WasteEntry):
    transfer_session: TransferSession
    godown: GodownMaster

class BranchBase(ISTModel):
    name: str
    description: Optional[str] = None

class BranchCreate(BranchBase):
    pass

class BranchUpdate(BranchBase):
    pass

class Branch(BranchBase):
    id: int
    created_at: datetime
    updated_at: datetime

class UserBase(ISTModel):
    username: str
    email: str
    full_name: str
    password: str
    role: Optional[str] = None

class UserCreate(ISTModel):
    username: str
    email: str
    full_name: str
    password: str
    role: Optional[str] = None
    branch_ids: list[int] = []

class UserUpdate(ISTModel):
    username: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    branch_ids: Optional[list[int]] = None

class User(ISTModel):
    id: int
    username: str
    email: str
    full_name: str
    role: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

class UserWithBranches(User):
    branches: list[Branch] = []

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(ISTModel):
    user_id: int
    username: str
    full_name: str
    email: str
    role: str | None = None
    branches: list[Branch] = []

class ProductionOrderStatusEnum(str, Enum):
    CREATED = "CREATED"
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class RawProductBase(ISTModel):
    product_name: str
    product_initial: str

class RawProductCreate(RawProductBase):
    branch_id: Optional[int] = None

class RawProductUpdate(RawProductBase):
    pass

class RawProduct(RawProductBase):
    id: int
    branch_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

class FinishedGoodBase(ISTModel):
    product_name: str
    product_initial: str

class FinishedGoodCreate(FinishedGoodBase):
    branch_id: Optional[int] = None

class FinishedGoodUpdate(FinishedGoodBase):
    pass

class FinishedGood(FinishedGoodBase):
    id: int
    branch_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

class ExtractionBase(ISTModel):
    production_order_id: int
    finished_good_id: int
    extraction_percent: float

class ExtractionCreate(ExtractionBase):
    branch_id: Optional[int] = None

class Extraction(ExtractionBase):
    id: int
    branch_id: int
    created_at: datetime

class MaidaResultBase(ISTModel):
    production_order_id: int
    finished_good_id: int
    moisture_percent: Optional[float] = None
    ash_percent: Optional[float] = None
    dry_gluten_percent: Optional[float] = None
    wet_gluten_percent: Optional[float] = None
    sv_value: Optional[float] = None

class MaidaResultCreate(MaidaResultBase):
    branch_id: Optional[int] = None

class MaidaResult(MaidaResultBase):
    id: int
    branch_id: int
    created_at: datetime

class GranulationTemplateBase(ISTModel):
    finished_good_id: int
    columns_definition: dict
    is_active: bool = True

class GranulationTemplateCreate(GranulationTemplateBase):
    branch_id: Optional[int] = None

class ProductionOrderGranulationBase(BaseModel):
    finished_good_id: int
    granulation_values: dict

class ProductionOrderGranulationCreate(ProductionOrderGranulationBase):
    production_order_id: int
    branch_id: Optional[int] = None

class ProductionOrderGranulation(ProductionOrderGranulationBase):
    id: int
    production_order_id: int
    branch_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class GranulationTemplate(GranulationTemplateBase):
    id: int
    branch_id: int
    created_at: datetime
    id: int
    branch_id: int
    created_at: datetime
    finished_good: Optional[FinishedGood] = None

class GranulationResultBase(ISTModel):
    production_order_id: int
    finished_good_id: int
    granulation_values: dict

class GranulationResultCreate(GranulationResultBase):
    branch_id: Optional[int] = None

class GranulationResult(GranulationResultBase):
    id: int
    branch_id: int
    created_at: datetime

class CustomerBase(ISTModel):
    customer_name: str
    contact_person: Optional[str] = None
    contact_person_mobile: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pin_code: Optional[str] = None
    gst_number: Optional[str] = None
    is_active: bool = True

class CustomerCreate(CustomerBase):
    branch_id: Optional[int] = None

class Customer(CustomerBase):
    customer_id: int
    branch_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

class OrderItemBase(ISTModel):
    finished_good_id: int
    quantity_ton: Optional[float] = 0.0
    price_per_ton: Optional[float] = 0.0
    bag_size_id: Optional[int] = None
    bag_size_weight: Optional[int] = None
    number_of_bags: Optional[int] = 0
    price_per_bag: Optional[float] = 0.0

class OrderItemCreate(OrderItemBase):
    pass

class OrderItem(OrderItemBase):
    order_item_id: int
    order_id: int
    branch_id: int
    created_at: datetime
    dispatched_qty: Optional[float] = 0.0
    remaining_qty: Optional[float] = 0.0
    product_name: Optional[str] = None
    dispatched_bags_total: Optional[int] = 0

class CustomerOrderBase(ISTModel):
    order_code: str
    customer_id: int
    order_status: Optional[str] = 'PENDING'
    order_date: Optional[datetime] = None
    completed_time: Optional[datetime] = None
    remarks: Optional[str] = None

    @validator('order_date', 'completed_time', pre=True)
    def _parse_order_dates(cls, v):
        return parse_datetime(v)

class CustomerOrderCreate(CustomerOrderBase):
    branch_id: Optional[int] = None
    items: List[OrderItemCreate]

class CustomerMini(ISTModel):
    customer_id: int
    customer_name: str
    city: Optional[str] = None

class CustomerOrder(CustomerOrderBase):
    order_id: int
    branch_id: int
    items: List[OrderItem] = []
    customer: Optional[CustomerMini] = None
    customer_name: Optional[str] = None
    city: Optional[str] = None

class DriverBase(ISTModel):
    driver_name: str
    phone: Optional[str] = None
    license_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    is_active: bool = True

class DriverCreate(DriverBase):
    branch_id: Optional[int] = None

class Driver(DriverBase):
    driver_id: int
    branch_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

class DispatchItemBase(ISTModel):
    order_item_id: int
    finished_good_id: int
    dispatched_qty_ton: float
    bag_size_id: Optional[int] = None
    dispatched_bags: Optional[int] = 0
    item_status: Optional[str] = "DELIVERED"

class DispatchItemCreate(DispatchItemBase):
    pass

class DispatchItem(DispatchItemBase):
    id: int
    dispatch_id: int
    created_at: datetime
    product_name: Optional[str] = None
    ordered_qty_ton: Optional[float] = 0.0
    remaining_qty_ton: Optional[float] = 0.0

class DispatchBase(ISTModel):
    order_id: int
    driver_id: int
    dispatched_quantity_ton: float = 0.0
    dispatched_bags: Optional[int] = 0
    bag_size_id: Optional[int] = None
    state: Optional[str] = None
    city: Optional[str] = None
    warehouse_loader: Optional[str] = None
    actual_dispatch_date: datetime
    delivery_date: Optional[datetime] = None
    status: Optional[str] = "DISPATCHED"
    remarks: Optional[str] = None

class DispatchCreate(DispatchBase):
    branch_id: Optional[int] = None
    dispatch_items: List[DispatchItemCreate]

class DispatchUpdate(ISTModel):
    order_id: Optional[int] = None
    driver_id: Optional[int] = None
    state: Optional[str] = None
    city: Optional[str] = None
    warehouse_loader: Optional[str] = None
    actual_dispatch_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    status: Optional[str] = None
    remarks: Optional[str] = None
    dispatch_items: Optional[List[DispatchItemCreate]] = None

class Dispatch(DispatchBase):
    dispatch_id: int
    branch_id: int
    created_at: datetime

class DispatchWithDetails(Dispatch):
    order: Optional[CustomerOrder] = None
    driver: Optional[Driver] = None
    items: List[DispatchItem] = []
    bag_size: Optional[BagSize] = None
    dispatched_bags: Optional[int] = 0
    bag_size_id: Optional[int] = None
    state: Optional[str] = None
    city: Optional[str] = None
    warehouse_loader: Optional[str] = None
    actual_dispatch_date: datetime
    delivery_date: Optional[datetime] = None
    status: Optional[str] = 'DISPATCHED'
    driver_photo: Optional[str] = None
    remarks: Optional[str] = None

    @validator('actual_dispatch_date', 'delivery_date', pre=True)
    def _parse_dispatch_dates(cls, v):
        return parse_datetime(v)

class DispatchItemBase(ISTModel):
    order_item_id: int
    finished_good_id: int
    dispatched_qty_ton: float
    bag_size_id: Optional[int] = None
    dispatched_bags: Optional[int] = None

class DispatchItemCreate(DispatchItemBase):
    pass

class DispatchItem(DispatchItemBase):
    id: int
    dispatch_id: int
    item_status: str
    created_at: datetime

class DispatchCreate(DispatchBase):
    branch_id: Optional[int] = None
    dispatch_items: Optional[List[DispatchItemCreate]] = []

class DispatchUpdate(ISTModel):
    order_id: Optional[int] = None
    driver_id: Optional[int] = None
    dispatched_quantity_ton: Optional[float] = None
    dispatched_bags: Optional[int] = None
    bag_size_id: Optional[int] = None
    state: Optional[str] = None
    city: Optional[str] = None
    warehouse_loader: Optional[str] = None
    actual_dispatch_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    status: Optional[str] = None
    remarks: Optional[str] = None
    dispatch_items: Optional[List[DispatchItemCreate]] = None

    @validator('actual_dispatch_date', 'delivery_date', pre=True)
    def _parse_dispatch_dates(cls, v):
        return parse_datetime(v)

class Dispatch(DispatchBase):
    dispatch_id: int
    branch_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class DispatchItemWithDetails(DispatchItem):
    order_item: Optional[OrderItem] = None
    finished_good: Optional[FinishedGood] = None
    ordered_qty_ton: Optional[float] = 0.0
    remaining_qty_ton: Optional[float] = 0.0
    product_name: Optional[str] = None

class DispatchWithDetails(Dispatch):
    order: Optional[CustomerOrder] = None
    driver: Optional[Driver] = None
    bag_size: Optional[BagSize] = None
    items: List[DispatchItemWithDetails] = []

class ProductionOrderBase(ISTModel):
    order_number: str
    raw_product_id: int
    quantity: float
    order_date: Optional[datetime] = None
    target_finish_date: datetime
    status: Optional[ProductionOrderStatusEnum] = ProductionOrderStatusEnum.CREATED

    @validator('order_date', 'target_finish_date', pre=True)
    def _parse_dates(cls, v):
        return parse_datetime(v)

class ProductionOrderCreate(ProductionOrderBase):
    branch_id: Optional[int] = None

class ProductionOrderUpdate(BaseModel):
    order_number: Optional[str] = None
    quantity: Optional[float] = None
    target_finish_date: Optional[datetime] = None
    status: Optional[ProductionOrderStatusEnum] = None

# Production Order Source Bin Schemas (Blend Configuration)
class ProductionOrderSourceBinBase(BaseModel):
    bin_id: int
    blend_percentage: float
    quantity: float

class ProductionOrderSourceBinCreate(ProductionOrderSourceBinBase):
    pass

class ProductionOrderSourceBin(ProductionOrderSourceBinBase):
    id: int
    production_order_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ProductionOrderSourceBinWithDetails(ProductionOrderSourceBinBase):
    id: int
    production_order_id: int
    bin: Bin
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Production Order Destination Bin Schemas (Distribution Configuration)
class ProductionOrderDestinationBinBase(BaseModel):
    bin_id: int
    quantity: float

class ProductionOrderDestinationBinCreate(ProductionOrderDestinationBinBase):
    pass

class ProductionOrderDestinationBin(ProductionOrderDestinationBinBase):
    id: int
    production_order_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ProductionOrderDestinationBinWithDetails(ProductionOrderDestinationBinBase):
    id: int
    production_order_id: int
    bin: Bin
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ProductionOrderWithProduct(ProductionOrderBase):
    id: int
    branch_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    raw_product: RawProduct

class ProductionOrderWithPlanning(ProductionOrderWithProduct):
    source_bins: List[ProductionOrderSourceBinWithDetails] = []
    destination_bins: List[ProductionOrderDestinationBinWithDetails] = []

class ProductionOrder(ProductionOrderBase):
    id: int
    branch_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

# Planning Configuration Schema
class ProductionOrderPlanningCreate(BaseModel):
    source_bins: List[ProductionOrderSourceBinCreate]
    destination_bins: List[ProductionOrderDestinationBinCreate]

class TransferRecordingStartTransfer(BaseModel):
    production_order_id: int
    destination_bin_id: int

class TransferRecordingCompleteTransfer(BaseModel):
    water_added: float
    moisture_level: float
    quantity_transferred: float

class TransferRecordingBase(ISTModel):
    production_order_id: int
    destination_bin_id: int
    status: TransferRecordingStatusEnum = TransferRecordingStatusEnum.PLANNED
    quantity_planned: float = 0.0
    quantity_transferred: float = 0.0
    water_added: Optional[float] = None
    moisture_level: Optional[float] = None
    transfer_start_time: Optional[datetime] = None
    transfer_end_time: Optional[datetime] = None

class TransferRecordingCreate(TransferRecordingBase):
    branch_id: Optional[int] = None

class TransferRecording(TransferRecordingBase):
    id: int
    branch_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

class TransferRecordingWithDetails(TransferRecording):
    production_order: ProductionOrder
    destination_bin: Bin
    created_by_user: Optional[User] = None
