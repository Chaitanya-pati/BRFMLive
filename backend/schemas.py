from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from enum import Enum

class ClaimStatusEnum(str, Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    CLOSED = "Closed"

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

# Resolve forward references
VehicleEntryWithLabTests.model_rebuild()
