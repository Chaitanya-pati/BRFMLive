from pydantic import BaseModel, validator
from datetime import datetime
from typing import Optional
from enum import Enum
from utils.datetime_utils import format_ist_iso, parse_datetime

class ISTModel(BaseModel):
    """Base model with IST datetime serialization"""
    class Config:
        json_encoders = {datetime: format_ist_iso}
        from_attributes = True

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

class SupplierBase(ISTModel):
    supplier_name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    street: Optional[str] = None
    city: str
    district: Optional[str] = None
    state: str
    zip_code: Optional[str] = None
    gstin: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(SupplierBase):
    pass

class Supplier(SupplierBase):
    id: int
    created_at: datetime
    updated_at: datetime

class VehicleEntryBase(ISTModel):
    vehicle_number: str
    supplier_id: int
    bill_no: str
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    arrival_time: Optional[datetime] = None
    notes: Optional[str] = None
    
    @validator('arrival_time', pre=True)
    def _parse_arrival_time(cls, v):
        return parse_datetime(v)

class VehicleEntryCreate(VehicleEntryBase):
    pass

class VehicleEntry(VehicleEntryBase):
    id: int
    created_at: datetime
    updated_at: datetime
    supplier_bill_photo: Optional[str] = None
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
    raise_claim: Optional[int] = 0
    
    @validator('test_date', pre=True)
    def _parse_dates(cls, v):
        return parse_datetime(v)

class LabTestCreate(LabTestBase):
    pass

class LabTest(LabTestBase):
    id: int
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
    pass

class GodownMasterUpdate(GodownMasterBase):
    pass

class GodownMaster(GodownMasterBase):
    id: int
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
    pass

class UnloadingEntry(UnloadingEntryBase):
    id: int
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
    status: BinStatusEnum = BinStatusEnum.ACTIVE

class BinCreate(BinBase):
    pass

class BinUpdate(ISTModel):
    bin_number: Optional[str] = None
    capacity: Optional[float] = None
    current_quantity: Optional[float] = None
    material_type: Optional[str] = None
    status: Optional[BinStatusEnum] = None

class Bin(BinBase):
    id: int
    created_at: datetime
    updated_at: datetime

class MagnetBase(ISTModel):
    name: str
    description: Optional[str] = None
    status: BinStatusEnum = BinStatusEnum.ACTIVE

class MagnetCreate(MagnetBase):
    pass

class MagnetUpdate(ISTModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[BinStatusEnum] = None

class Magnet(MagnetBase):
    id: int
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

class TransferSessionBase(ISTModel):
    source_godown_id: int
    destination_bin_id: int
    magnet_id: Optional[int] = None
    notes: Optional[str] = None

class TransferSessionCreate(TransferSessionBase):
    pass

class TransferSessionUpdate(ISTModel):
    transferred_quantity: Optional[float] = None
    status: Optional[TransferSessionStatusEnum] = None
    notes: Optional[str] = None

class TransferSession(TransferSessionBase):
    id: int
    start_timestamp: datetime
    stop_timestamp: Optional[datetime] = None
    transferred_quantity: Optional[float] = None
    status: TransferSessionStatusEnum
    cleaning_interval_hours: int
    created_at: datetime
    updated_at: datetime

class TransferSessionWithDetails(TransferSession):
    source_godown: GodownMaster
    destination_bin: Bin
    magnet: Optional[Magnet] = None
    cleaning_records: list['MagnetCleaningRecord'] = []

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

# Resolve forward references
VehicleEntryWithLabTests.model_rebuild()
TransferSessionWithDetails.model_rebuild()
WasteEntryWithDetails.model_rebuild()
