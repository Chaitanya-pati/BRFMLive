from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from enum import Enum

class ClaimStatusEnum(str, Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    CLOSED = "Closed"

class BinStatusEnum(str, Enum):
    ACTIVE = "Active"
    INACTIVE = "Inactive"
    MAINTENANCE = "Maintenance"
    FULL = "Full"

class SupplierBase(BaseModel):
    supplier_name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    state: str
    city: str

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(SupplierBase):
    pass

class Supplier(SupplierBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class VehicleEntryBase(BaseModel):
    vehicle_number: str
    supplier_id: int
    bill_no: str
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    arrival_time: Optional[datetime] = None
    notes: Optional[str] = None

class VehicleEntryCreate(VehicleEntryBase):
    pass

class VehicleEntry(VehicleEntryBase):
    id: int
    created_at: datetime
    updated_at: datetime
    supplier_bill_photo: Optional[str] = None
    vehicle_photo: Optional[str] = None
    
    class Config:
        from_attributes = True

class VehicleEntryWithSupplier(VehicleEntry):
    supplier: Supplier

class VehicleEntryWithLabTests(VehicleEntry):
    supplier: Supplier
    lab_tests: list['LabTest'] = []

class LabTestBase(BaseModel):
    vehicle_entry_id: int
    test_date: Optional[datetime] = None
    document_no: Optional[str] = None
    issue_no: Optional[str] = "01"
    issue_date: Optional[datetime] = None
    department: Optional[str] = "QA"
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

class LabTestCreate(LabTestBase):
    pass

class LabTest(LabTestBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class LabTestWithVehicle(LabTest):
    vehicle_entry: VehicleEntryWithSupplier
    has_claim: bool = False

class ClaimBase(BaseModel):
    lab_test_id: int
    issue_found: str
    category_detected: Optional[str] = None
    claim_date: Optional[datetime] = None
    remarks: Optional[str] = None

class ClaimCreate(ClaimBase):
    pass

class ClaimUpdate(BaseModel):
    claim_status: Optional[ClaimStatusEnum] = None
    remarks: Optional[str] = None

class Claim(ClaimBase):
    id: int
    claim_status: ClaimStatusEnum
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ClaimWithLabTest(Claim):
    lab_test: LabTestWithVehicle

class GodownMasterBase(BaseModel):
    name: str
    capacity: int
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
    
    class Config:
        from_attributes = True

class UnloadingEntryBase(BaseModel):
    vehicle_entry_id: int
    godown_id: int
    gross_weight: float
    empty_vehicle_weight: float
    net_weight: float
    unloading_start_time: Optional[datetime] = None
    unloading_end_time: Optional[datetime] = None
    notes: Optional[str] = None

class UnloadingEntryCreate(UnloadingEntryBase):
    pass

class UnloadingEntry(UnloadingEntryBase):
    id: int
    before_unloading_image: Optional[str] = None
    after_unloading_image: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class UnloadingEntryWithDetails(UnloadingEntry):
    vehicle_entry: VehicleEntryWithSupplier
    godown: GodownMaster

class BinBase(BaseModel):
    bin_number: str
    capacity: float
    current_quantity: Optional[float] = 0.0
    material_type: Optional[str] = None
    status: BinStatusEnum = BinStatusEnum.ACTIVE

class BinCreate(BinBase):
    pass

class BinUpdate(BaseModel):
    bin_number: Optional[str] = None
    capacity: Optional[float] = None
    current_quantity: Optional[float] = None
    material_type: Optional[str] = None
    status: Optional[BinStatusEnum] = None

class Bin(BinBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class MagnetBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: BinStatusEnum = BinStatusEnum.ACTIVE

class MagnetCreate(MagnetBase):
    pass

class MagnetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[BinStatusEnum] = None

class Magnet(MagnetBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class RouteMagnetMappingBase(BaseModel):
    magnet_id: int
    source_godown_id: Optional[int] = None
    source_bin_id: Optional[int] = None
    destination_bin_id: int
    cleaning_interval_hours: int = 3

class RouteMagnetMappingCreate(RouteMagnetMappingBase):
    pass

class RouteMagnetMappingUpdate(BaseModel):
    magnet_id: Optional[int] = None
    source_godown_id: Optional[int] = None
    source_bin_id: Optional[int] = None
    destination_bin_id: Optional[int] = None
    cleaning_interval_hours: Optional[int] = None

class RouteMagnetMapping(RouteMagnetMappingBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class RouteMagnetMappingWithDetails(RouteMagnetMapping):
    magnet: Magnet
    source_godown: Optional[GodownMaster] = None
    source_bin: Optional[Bin] = None
    destination_bin: Bin

class MagnetCleaningRecordBase(BaseModel):
    magnet_id: int
    cleaning_timestamp: Optional[datetime] = None
    notes: Optional[str] = None

class MagnetCleaningRecordCreate(MagnetCleaningRecordBase):
    pass

class MagnetCleaningRecordUpdate(BaseModel):
    magnet_id: Optional[int] = None
    cleaning_timestamp: Optional[datetime] = None
    notes: Optional[str] = None

class MagnetCleaningRecord(MagnetCleaningRecordBase):
    id: int
    before_cleaning_photo: Optional[str] = None
    after_cleaning_photo: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class MagnetCleaningRecordWithDetails(MagnetCleaningRecord):
    magnet: Magnet

# Resolve forward references
VehicleEntryWithLabTests.model_rebuild()
