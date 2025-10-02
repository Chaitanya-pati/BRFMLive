from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List, Optional
import base64
from datetime import datetime

from database import engine, get_db, Base
import models
import schemas

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gate Entry & Lab Testing API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
def create_vehicle_entry(
    vehicle_number: str = Form(...),
    supplier_id: int = Form(...),
    bill_no: str = Form(...),
    driver_name: Optional[str] = Form(None),
    driver_phone: Optional[str] = Form(None),
    arrival_time: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    supplier_bill_photo: Optional[str] = Form(None),
    vehicle_photo: Optional[str] = Form(None),
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
        try:
            db_vehicle.supplier_bill_photo = base64.b64decode(supplier_bill_photo.split(',')[1] if ',' in supplier_bill_photo else supplier_bill_photo)
        except:
            pass
    
    if vehicle_photo:
        try:
            db_vehicle.vehicle_photo = base64.b64decode(vehicle_photo.split(',')[1] if ',' in vehicle_photo else vehicle_photo)
        except:
            pass
    
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

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
    return Response(content=vehicle.supplier_bill_photo, media_type="image/jpeg")

@app.get("/api/vehicles/{vehicle_id}/vehicle_photo")
def get_vehicle_photo(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = db.query(models.VehicleEntry).filter(models.VehicleEntry.id == vehicle_id).first()
    if not vehicle or not vehicle.vehicle_photo:
        raise HTTPException(status_code=404, detail="Vehicle photo not found")
    return Response(content=vehicle.vehicle_photo, media_type="image/jpeg")

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
    return lab_tests

@app.get("/api/lab-tests/{lab_test_id}", response_model=schemas.LabTestWithVehicle)
def get_lab_test(lab_test_id: int, db: Session = Depends(get_db)):
    lab_test = db.query(models.LabTest).filter(models.LabTest.id == lab_test_id).first()
    if not lab_test:
        raise HTTPException(status_code=404, detail="Lab test not found")
    return lab_test

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
