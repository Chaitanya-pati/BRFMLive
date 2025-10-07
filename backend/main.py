from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Optional
import base64
from datetime import datetime
import json
import os
import uuid
from pathlib import Path

from database import engine, get_db, Base
import models
import schemas

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gate Entry & Lab Testing API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
def read_root():
    return {"message": "Gate Entry & Lab Testing API", "status": "running"}

@app.post("/api/suppliers", response_model=schemas.Supplier)
def create_supplier(supplier: schemas.SupplierCreate, db: Session = Depends(get_db)):
    db_supplier = models.Supplier(**supplier.dict())
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    return db_supplier

@app.get("/api/suppliers", response_model=List[schemas.Supplier])
def get_suppliers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    suppliers = db.query(models.Supplier).offset(skip).limit(limit).all()
    return suppliers

@app.get("/api/suppliers/{supplier_id}", response_model=schemas.Supplier)
def get_supplier(supplier_id: int, db: Session = Depends(get_db)):
    supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier

@app.put("/api/suppliers/{supplier_id}", response_model=schemas.Supplier)
def update_supplier(supplier_id: int, supplier: schemas.SupplierUpdate, db: Session = Depends(get_db)):
    db_supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    for key, value in supplier.dict().items():
        setattr(db_supplier, key, value)
    
    db.commit()
    db.refresh(db_supplier)
    return db_supplier

@app.delete("/api/suppliers/{supplier_id}")
def delete_supplier(supplier_id: int, db: Session = Depends(get_db)):
    db_supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    db.delete(db_supplier)
    db.commit()
    return {"message": "Supplier deleted successfully"}

@app.post("/api/vehicles", response_model=schemas.VehicleEntry)
async def create_vehicle_entry(
    vehicle_number: str = Form(...),
    supplier_id: int = Form(...),
    bill_no: str = Form(...),
    driver_name: Optional[str] = Form(None),
    driver_phone: Optional[str] = Form(None),
    arrival_time: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    supplier_bill_photo: Optional[UploadFile] = File(None),
    vehicle_photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    arrival_dt = None
    if arrival_time:
        try:
            arrival_dt = datetime.fromisoformat(arrival_time.replace('Z', '+00:00'))
        except:
            arrival_dt = datetime.utcnow()
    
    db_vehicle = models.VehicleEntry(
        vehicle_number=vehicle_number,
        supplier_id=supplier_id,
        bill_no=bill_no,
        driver_name=driver_name,
        driver_phone=driver_phone,
        arrival_time=arrival_dt or datetime.utcnow(),
        notes=notes
    )
    
    if supplier_bill_photo:
        bill_path = await save_upload_file(supplier_bill_photo)
        db_vehicle.supplier_bill_photo = bill_path.encode('utf-8')
    
    if vehicle_photo:
        vehicle_path = await save_upload_file(vehicle_photo)
        db_vehicle.vehicle_photo = vehicle_path.encode('utf-8')
    
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

@app.get("/api/vehicles/available-for-testing", response_model=List[schemas.VehicleEntryWithSupplier])
def get_vehicles_available_for_testing(db: Session = Depends(get_db)):
    # Get all vehicle IDs that already have lab tests
    tested_vehicle_ids = db.query(models.LabTest.vehicle_entry_id).distinct().all()
    tested_vehicle_ids = [vid[0] for vid in tested_vehicle_ids] if tested_vehicle_ids else []
    
    # Get vehicles that don't have lab tests yet
    if tested_vehicle_ids:
        available_vehicles = db.query(models.VehicleEntry).filter(
            ~models.VehicleEntry.id.in_(tested_vehicle_ids)
        ).all()
    else:
        # If no lab tests exist, all vehicles are available
        available_vehicles = db.query(models.VehicleEntry).all()
    
    return available_vehicles

@app.get("/api/vehicles", response_model=List[schemas.VehicleEntryWithSupplier])
def get_vehicle_entries(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    vehicles = db.query(models.VehicleEntry).offset(skip).limit(limit).all()
    return vehicles

@app.get("/api/vehicles/{vehicle_id}", response_model=schemas.VehicleEntryWithSupplier)
def get_vehicle_entry(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = db.query(models.VehicleEntry).filter(models.VehicleEntry.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle entry not found")
    return vehicle

@app.get("/api/vehicles/{vehicle_id}/bill_photo")
def get_bill_photo(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = db.query(models.VehicleEntry).filter(models.VehicleEntry.id == vehicle_id).first()
    if not vehicle or not vehicle.supplier_bill_photo:
        raise HTTPException(status_code=404, detail="Bill photo not found")
    
    # Check if it's a file path or binary data
    photo_data = vehicle.supplier_bill_photo
    if isinstance(photo_data, bytes):
        photo_str = photo_data.decode('utf-8')
        if photo_str.startswith('/uploads/'):
            # It's a file path
            file_path = UPLOAD_DIR / photo_str.split('/')[-1]
            if file_path.exists():
                with open(file_path, 'rb') as f:
                    return Response(content=f.read(), media_type="image/jpeg")
        else:
            # It's binary image data
            return Response(content=photo_data, media_type="image/jpeg")
    
    raise HTTPException(status_code=404, detail="Bill photo not found")

@app.get("/api/vehicles/{vehicle_id}/vehicle_photo")
def get_vehicle_photo(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = db.query(models.VehicleEntry).filter(models.VehicleEntry.id == vehicle_id).first()
    if not vehicle or not vehicle.vehicle_photo:
        raise HTTPException(status_code=404, detail="Vehicle photo not found")
    
    # Check if it's a file path or binary data
    photo_data = vehicle.vehicle_photo
    if isinstance(photo_data, bytes):
        photo_str = photo_data.decode('utf-8')
        if photo_str.startswith('/uploads/'):
            # It's a file path
            file_path = UPLOAD_DIR / photo_str.split('/')[-1]
            if file_path.exists():
                with open(file_path, 'rb') as f:
                    return Response(content=f.read(), media_type="image/jpeg")
        else:
            # It's binary image data
            return Response(content=photo_data, media_type="image/jpeg")
    
    raise HTTPException(status_code=404, detail="Vehicle photo not found")

@app.post("/api/lab-tests", response_model=schemas.LabTest)
def create_lab_test(lab_test: schemas.LabTestCreate, db: Session = Depends(get_db)):
    vehicle = db.query(models.VehicleEntry).filter(models.VehicleEntry.id == lab_test.vehicle_entry_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle entry not found")
    
    db_lab_test = models.LabTest(**lab_test.dict())
    db.add(db_lab_test)
    db.commit()
    db.refresh(db_lab_test)
    return db_lab_test

@app.get("/api/lab-tests", response_model=List[schemas.LabTestWithVehicle])
def get_lab_tests(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    lab_tests = db.query(models.LabTest).offset(skip).limit(limit).all()
    
    # Add has_claim flag to each lab test
    result = []
    for lab_test in lab_tests:
        lab_test_dict = schemas.LabTestWithVehicle.model_validate(lab_test).model_dump()
        claim_exists = db.query(models.Claim).filter(models.Claim.lab_test_id == lab_test.id).first()
        lab_test_dict['has_claim'] = claim_exists is not None
        result.append(lab_test_dict)
    
    return result

@app.get("/api/lab-tests/{lab_test_id}", response_model=schemas.LabTestWithVehicle)
def get_lab_test(lab_test_id: int, db: Session = Depends(get_db)):
    lab_test = db.query(models.LabTest).filter(models.LabTest.id == lab_test_id).first()
    if not lab_test:
        raise HTTPException(status_code=404, detail="Lab test not found")
    return lab_test

@app.post("/api/claims/create", response_model=schemas.Claim)
def create_claim(claim: schemas.ClaimCreate, db: Session = Depends(get_db)):
    lab_test = db.query(models.LabTest).filter(models.LabTest.id == claim.lab_test_id).first()
    if not lab_test:
        raise HTTPException(status_code=404, detail="Lab test not found")
    
    db_claim = models.Claim(**claim.dict())
    db.add(db_claim)
    db.commit()
    db.refresh(db_claim)
    return db_claim

@app.get("/api/claims", response_model=List[schemas.ClaimWithLabTest])
def get_claims(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    claims = db.query(models.Claim).offset(skip).limit(limit).all()
    return claims

@app.patch("/api/claims/{claim_id}", response_model=schemas.Claim)
def update_claim(claim_id: int, claim_update: schemas.ClaimUpdate, db: Session = Depends(get_db)):
    db_claim = db.query(models.Claim).filter(models.Claim.id == claim_id).first()
    if not db_claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    update_data = claim_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_claim, key, value)
    
    db.commit()
    db.refresh(db_claim)
    return db_claim

@app.delete("/api/lab-tests/{lab_test_id}")
def delete_lab_test(lab_test_id: int, db: Session = Depends(get_db)):
    db_lab_test = db.query(models.LabTest).filter(models.LabTest.id == lab_test_id).first()
    if not db_lab_test:
        raise HTTPException(status_code=404, detail="Lab test not found")
    
    db.delete(db_lab_test)
    db.commit()
    return {"message": "Lab test deleted successfully"}

async def save_upload_file(file: UploadFile) -> str:
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    return f"/uploads/{unique_filename}"

@app.get("/api/godown-types")
def get_godown_types():
    with open("godown_types.json", "r") as f:
        data = json.load(f)
    return data["godown_types"]

@app.post("/api/godowns", response_model=schemas.GodownMaster)
def create_godown(godown: schemas.GodownMasterCreate, db: Session = Depends(get_db)):
    db_godown = models.GodownMaster(**godown.dict())
    db.add(db_godown)
    db.commit()
    db.refresh(db_godown)
    return db_godown

@app.get("/api/godowns", response_model=List[schemas.GodownMaster])
def get_godowns(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    godowns = db.query(models.GodownMaster).offset(skip).limit(limit).all()
    return godowns

@app.get("/api/godowns/{godown_id}", response_model=schemas.GodownMaster)
def get_godown(godown_id: int, db: Session = Depends(get_db)):
    godown = db.query(models.GodownMaster).filter(models.GodownMaster.id == godown_id).first()
    if not godown:
        raise HTTPException(status_code=404, detail="Godown not found")
    return godown

@app.put("/api/godowns/{godown_id}", response_model=schemas.GodownMaster)
def update_godown(godown_id: int, godown: schemas.GodownMasterUpdate, db: Session = Depends(get_db)):
    db_godown = db.query(models.GodownMaster).filter(models.GodownMaster.id == godown_id).first()
    if not db_godown:
        raise HTTPException(status_code=404, detail="Godown not found")
    
    for key, value in godown.dict().items():
        setattr(db_godown, key, value)
    
    db.commit()
    db.refresh(db_godown)
    return db_godown

@app.delete("/api/godowns/{godown_id}")
def delete_godown(godown_id: int, db: Session = Depends(get_db)):
    db_godown = db.query(models.GodownMaster).filter(models.GodownMaster.id == godown_id).first()
    if not db_godown:
        raise HTTPException(status_code=404, detail="Godown not found")
    
    db.delete(db_godown)
    db.commit()
    return {"message": "Godown deleted successfully"}

@app.get("/api/vehicles/lab-tested", response_model=List[schemas.VehicleEntryWithLabTests])
def get_lab_tested_vehicles(db: Session = Depends(get_db)):
    # Get all lab test records with their vehicle entries
    lab_tests = db.query(models.LabTest).all()
    
    if not lab_tests:
        return []
    
    # Get unique vehicle IDs from lab tests
    tested_vehicle_ids = list(set([test.vehicle_entry_id for test in lab_tests]))
    
    # Fetch vehicles with those IDs
    lab_tested_vehicles = db.query(models.VehicleEntry).filter(
        models.VehicleEntry.id.in_(tested_vehicle_ids)
    ).all()
    
    return lab_tested_vehicles

@app.post("/api/unloading-entries", response_model=schemas.UnloadingEntry)
async def create_unloading_entry(
    vehicle_entry_id: int = Form(...),
    godown_id: int = Form(...),
    gross_weight: float = Form(...),
    empty_vehicle_weight: float = Form(...),
    net_weight: float = Form(...),
    unloading_start_time: Optional[str] = Form(None),
    unloading_end_time: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    before_unloading_image: Optional[UploadFile] = File(None),
    after_unloading_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    start_time = None
    if unloading_start_time:
        try:
            start_time = datetime.fromisoformat(unloading_start_time.replace('Z', '+00:00'))
        except:
            start_time = datetime.utcnow()
    
    end_time = None
    if unloading_end_time:
        try:
            end_time = datetime.fromisoformat(unloading_end_time.replace('Z', '+00:00'))
        except:
            end_time = datetime.utcnow()
    
    db_entry = models.UnloadingEntry(
        vehicle_entry_id=vehicle_entry_id,
        godown_id=godown_id,
        gross_weight=gross_weight,
        empty_vehicle_weight=empty_vehicle_weight,
        net_weight=net_weight,
        unloading_start_time=start_time or datetime.utcnow(),
        unloading_end_time=end_time or datetime.utcnow(),
        notes=notes
    )
    
    if before_unloading_image:
        db_entry.before_unloading_image = await save_upload_file(before_unloading_image)
    
    if after_unloading_image:
        db_entry.after_unloading_image = await save_upload_file(after_unloading_image)
    
    godown = db.query(models.GodownMaster).filter(models.GodownMaster.id == godown_id).first()
    if godown:
        net_weight_tons = net_weight / 1000
        godown.current_storage = (godown.current_storage or 0) + net_weight_tons
        db.add(godown)
    
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@app.get("/api/unloading-entries", response_model=List[schemas.UnloadingEntryWithDetails])
def get_unloading_entries(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    entries = db.query(models.UnloadingEntry).offset(skip).limit(limit).all()
    return entries

@app.get("/api/unloading-entries/{entry_id}", response_model=schemas.UnloadingEntryWithDetails)
def get_unloading_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(models.UnloadingEntry).filter(models.UnloadingEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Unloading entry not found")
    return entry

@app.delete("/api/unloading-entries/{entry_id}")
def delete_unloading_entry(entry_id: int, db: Session = Depends(get_db)):
    db_entry = db.query(models.UnloadingEntry).filter(models.UnloadingEntry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Unloading entry not found")
    
    godown = db.query(models.GodownMaster).filter(models.GodownMaster.id == db_entry.godown_id).first()
    if godown:
        net_weight_tons = db_entry.net_weight / 1000
        godown.current_storage = max(0, (godown.current_storage or 0) - net_weight_tons)
    
    db.delete(db_entry)
    db.commit()
    return {"message": "Unloading entry deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
