from pydantic import BaseModel
from datetime import datetime
from typing import Optional

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

class Claim(ClaimBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ClaimWithLabTest(Claim):
    lab_test: LabTestWithVehicle
