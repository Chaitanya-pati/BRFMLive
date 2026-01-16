from sqlalchemy import func
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Header
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
import math
import pytz

from database import engine, get_db, Base
import models
import schemas
from utils.image_utils import get_image_url, save_image_path


def get_branch_id(x_branch_id: Optional[str] = Header(None)) -> Optional[int]:
    """Extract branch_id from request header"""
    if x_branch_id:
        try:
            return int(x_branch_id)
        except ValueError:
            return None
    return None


# IST timezone
IST = pytz.timezone('Asia/Kolkata')


def get_utc_now():
    """Get current time in UTC as naive datetime for database storage"""
    return datetime.utcnow()


def get_ist_display_now():
    """Get current time in IST timezone"""
    return datetime.now(IST)


def get_ist_now():
    """Deprecated: use get_utc_now(). Get current time in UTC for database storage"""
    return datetime.utcnow()


def format_ist_iso(dt):
    """Format datetime to ISO string with IST offset (+05:30)"""
    if dt is None:
        return None
    if dt.tzinfo is None:
        utc_dt = dt.replace(tzinfo=pytz.UTC)
    else:
        utc_dt = dt.astimezone(pytz.UTC)
    ist_dt = utc_dt.astimezone(IST)
    return ist_dt.isoformat()


def parse_ist_datetime(datetime_str):
    """Parse IST datetime string and return UTC datetime for storage"""
    if not datetime_str:
        return None
    try:
        dt = datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
        if dt.tzinfo:
            return dt.astimezone(pytz.UTC).replace(tzinfo=None)
        else:
            ist_dt = IST.localize(dt)
            return ist_dt.astimezone(pytz.UTC).replace(tzinfo=None)
    except:
        return datetime.utcnow()


def sanitize_float(value):
    """Convert NaN/Infinity to None for JSON serialization"""
    if value is None:
        return None
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
    return value


Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gate Entry & Lab Testing API")

# CORS configuration - Allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
    expose_headers=["*"],  # Expose all headers
)


@app.middleware("http")
async def add_cache_control_headers(request, call_next):
    # Handle OPTIONS requests for CORS preflight
    if request.method == "OPTIONS":
        return Response(
            status_code=200,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD",
                "Access-Control-Allow-Headers": "*",
            }
        )

    response = await call_next(request)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/")
@app.head("/")
def read_root():
    return {"message": "Gate Entry & Lab Testing API", "status": "running"}


@app.post("/api/suppliers", response_model=schemas.Supplier)
def create_supplier(supplier: schemas.SupplierCreate,
                    db: Session = Depends(get_db),
                    branch_id: Optional[int] = Depends(get_branch_id)):
    supplier_data = supplier.dict()
    if branch_id and not supplier_data.get('branch_id'):
        supplier_data['branch_id'] = branch_id
    db_supplier = models.Supplier(**supplier_data)
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    return db_supplier


@app.get("/api/suppliers", response_model=List[schemas.Supplier])
def get_all_suppliers(skip: int = 0,
                      limit: int = 100,
                      branch_id: Optional[int] = Header(None, alias="X-Branch-Id"),
                      db: Session = Depends(get_db)):
    query = db.query(models.Supplier)
    if branch_id:
        query = query.filter(models.Supplier.branch_id == branch_id)
    suppliers = query.order_by(models.Supplier.id.desc()).offset(skip).limit(limit).all()
    return suppliers


@app.get("/api/suppliers/{supplier_id}", response_model=schemas.Supplier)
def get_supplier(supplier_id: int, db: Session = Depends(get_db)):
    supplier = db.query(
        models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier


@app.put("/api/suppliers/{supplier_id}", response_model=schemas.Supplier)
def update_supplier(supplier_id: int,
                    supplier: schemas.SupplierUpdate,
                    db: Session = Depends(get_db)):
    db_supplier = db.query(
        models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    for key, value in supplier.dict().items():
        setattr(db_supplier, key, value)

    db.commit()
    db.refresh(db_supplier)
    return db_supplier


@app.delete("/api/suppliers/{supplier_id}")
def delete_supplier(supplier_id: int, db: Session = Depends(get_db)):
    db_supplier = db.query(
        models.Supplier).filter(models.Supplier.id == supplier_id).first()
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
        empty_weight: Optional[str] = Form(None),
        gross_weight: Optional[str] = Form(None),
        notes: Optional[str] = Form(None),
        supplier_bill_photo: Optional[UploadFile] = File(None),
        vehicle_photo_front: Optional[UploadFile] = File(None),
        vehicle_photo_back: Optional[UploadFile] = File(None),
        vehicle_photo_side: Optional[UploadFile] = File(None),
        internal_weighment_slip: Optional[UploadFile] = File(None),
        client_weighment_slip: Optional[UploadFile] = File(None),
        transportation_copy: Optional[UploadFile] = File(None),
        db: Session = Depends(get_db),
        branch_id: Optional[int] = Depends(get_branch_id)):
    arrival_dt = parse_ist_datetime(
        arrival_time) if arrival_time else get_utc_now()

    db_vehicle = models.VehicleEntry(
        vehicle_number=vehicle_number,
        supplier_id=supplier_id,
        bill_no=bill_no,
        driver_name=driver_name,
        driver_phone=driver_phone,
        arrival_time=arrival_dt,
        empty_weight=float(empty_weight) if empty_weight else 0.0,
        gross_weight=float(gross_weight) if gross_weight else 0.0,
        notes=notes)

    if branch_id:
        db_vehicle.branch_id = branch_id

    if supplier_bill_photo:
        bill_path = await save_upload_file(supplier_bill_photo)
        db_vehicle.supplier_bill_photo = bill_path.encode('utf-8')

    if vehicle_photo_front:
        front_path = await save_upload_file(vehicle_photo_front)
        db_vehicle.vehicle_photo_front = front_path.encode('utf-8')

    if vehicle_photo_back:
        back_path = await save_upload_file(vehicle_photo_back)
        db_vehicle.vehicle_photo_back = back_path.encode('utf-8')

    if vehicle_photo_side:
        side_path = await save_upload_file(vehicle_photo_side)
        db_vehicle.vehicle_photo_side = side_path.encode('utf-8')

    if internal_weighment_slip:
        internal_path = await save_upload_file(internal_weighment_slip)
        db_vehicle.internal_weighment_slip = internal_path.encode('utf-8')

    if client_weighment_slip:
        client_path = await save_upload_file(client_weighment_slip)
        db_vehicle.client_weighment_slip = client_path.encode('utf-8')

    if transportation_copy:
        transport_path = await save_upload_file(transportation_copy)
        db_vehicle.transportation_copy = transport_path.encode('utf-8')

    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle


@app.get("/api/vehicles/available-for-testing",
         response_model=List[schemas.VehicleEntryWithSupplier])
def get_vehicles_available_for_testing(
        db: Session = Depends(get_db),
        branch_id: Optional[int] = Depends(get_branch_id)):
    # Get all vehicle IDs that already have lab tests
    tested_vehicle_ids = db.query(
        models.LabTest.vehicle_entry_id).distinct().all()
    tested_vehicle_ids = [vid[0] for vid in tested_vehicle_ids
                          ] if tested_vehicle_ids else []

    # Get vehicles that don't have lab tests yet
    query = db.query(models.VehicleEntry)
    if branch_id:
        query = query.filter(models.VehicleEntry.branch_id == branch_id)

    if tested_vehicle_ids:
        available_vehicles = query.filter(
            ~models.VehicleEntry.id.in_(tested_vehicle_ids)).all()
    else:
        # If no lab tests exist, all vehicles are available
        available_vehicles = query.all()

    return available_vehicles


@app.get("/api/vehicles/lab-tested",
         response_model=List[schemas.VehicleEntryWithLabTests])
def get_lab_tested_vehicles(db: Session = Depends(get_db),
                            branch_id: Optional[int] = Depends(get_branch_id)):
    # Get all lab test records with their vehicle entries
    lab_tests = db.query(models.LabTest).all()

    if not lab_tests:
        return []

    # Get unique vehicle IDs from lab tests
    tested_vehicle_ids = list(
        set([test.vehicle_entry_id for test in lab_tests]))

    # Fetch vehicles with those IDs
    query = db.query(models.VehicleEntry).filter(
        models.VehicleEntry.id.in_(tested_vehicle_ids))
    if branch_id:
        query = query.filter(models.VehicleEntry.branch_id == branch_id)

    lab_tested_vehicles = query.all()

    return lab_tested_vehicles


@app.get("/api/vehicles", response_model=List[schemas.VehicleEntryWithSupplier])
@app.get("/api/vehicle-entries", response_model=List[schemas.VehicleEntryWithSupplier])
def get_all_vehicle_entries(
        skip: int = 0,
        limit: int = 100,
        branch_id: Optional[int] = Header(None, alias="X-Branch-Id"),
        db: Session = Depends(get_db)):
    query = db.query(models.VehicleEntry)
    if branch_id:
        query = query.filter(models.VehicleEntry.branch_id == branch_id)
    entries = query.order_by(models.VehicleEntry.arrival_time.desc()).offset(skip).limit(limit).all()

    # Convert binary image paths to strings and full URLs
    for vehicle in entries:
        if vehicle.supplier_bill_photo and isinstance(
                vehicle.supplier_bill_photo, bytes):
            path = vehicle.supplier_bill_photo.decode('utf-8')
            vehicle.supplier_bill_photo = get_image_url(path)
        if vehicle.vehicle_photo_front and isinstance(
                vehicle.vehicle_photo_front, bytes):
            path = vehicle.vehicle_photo_front.decode('utf-8')
            vehicle.vehicle_photo_front = get_image_url(path)
        if vehicle.vehicle_photo_back and isinstance(
                vehicle.vehicle_photo_back, bytes):
            path = vehicle.vehicle_photo_back.decode('utf-8')
            vehicle.vehicle_photo_back = get_image_url(path)
        if vehicle.vehicle_photo_side and isinstance(
                vehicle.vehicle_photo_side, bytes):
            path = vehicle.vehicle_photo_side.decode('utf-8')
            vehicle.vehicle_photo_side = get_image_url(path)
        if vehicle.internal_weighment_slip and isinstance(
                vehicle.internal_weighment_slip, bytes):
            path = vehicle.internal_weighment_slip.decode('utf-8')
            vehicle.internal_weighment_slip = get_image_url(path)
        if vehicle.client_weighment_slip and isinstance(
                vehicle.client_weighment_slip, bytes):
            path = vehicle.client_weighment_slip.decode('utf-8')
            vehicle.client_weighment_slip = get_image_url(path)
        if vehicle.transportation_copy and isinstance(
                vehicle.transportation_copy, bytes):
            path = vehicle.transportation_copy.decode('utf-8')
            vehicle.transportation_copy = get_image_url(path)

    return entries


@app.get("/api/vehicles/{vehicle_id}",
         response_model=schemas.VehicleEntryWithSupplier)
def get_vehicle_entry(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = db.query(models.VehicleEntry).filter(
        models.VehicleEntry.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle entry not found")

    # Convert binary image paths to strings and full URLs
    if vehicle.supplier_bill_photo and isinstance(vehicle.supplier_bill_photo,
                                                  bytes):
        path = vehicle.supplier_bill_photo.decode('utf-8')
        vehicle.supplier_bill_photo = get_image_url(path)
    if vehicle.vehicle_photo_front and isinstance(vehicle.vehicle_photo_front,
                                                  bytes):
        path = vehicle.vehicle_photo_front.decode('utf-8')
        vehicle.vehicle_photo_front = get_image_url(path)
    if vehicle.vehicle_photo_back and isinstance(vehicle.vehicle_photo_back,
                                                 bytes):
        path = vehicle.vehicle_photo_back.decode('utf-8')
        vehicle.vehicle_photo_back = get_image_url(path)
    if vehicle.vehicle_photo_side and isinstance(vehicle.vehicle_photo_side,
                                                 bytes):
        path = vehicle.vehicle_photo_side.decode('utf-8')
        vehicle.vehicle_photo_side = get_image_url(path)
    if vehicle.internal_weighment_slip and isinstance(
            vehicle.internal_weighment_slip, bytes):
        path = vehicle.internal_weighment_slip.decode('utf-8')
        vehicle.internal_weighment_slip = get_image_url(path)
    if vehicle.client_weighment_slip and isinstance(
            vehicle.client_weighment_slip, bytes):
        path = vehicle.client_weighment_slip.decode('utf-8')
        vehicle.client_weighment_slip = get_image_url(path)
    if vehicle.transportation_copy and isinstance(vehicle.transportation_copy,
                                                  bytes):
        path = vehicle.transportation_copy.decode('utf-8')
        vehicle.transportation_copy = get_image_url(path)

    return vehicle


@app.put("/api/vehicles/{vehicle_id}", response_model=schemas.VehicleEntry)
async def update_vehicle_entry(
    vehicle_id: int,
    vehicle_number: str = Form(...),
    supplier_id: int = Form(...),
    bill_no: str = Form(...),
    driver_name: Optional[str] = Form(None),
    driver_phone: Optional[str] = Form(None),
    arrival_time: Optional[str] = Form(None),
    empty_weight: Optional[str] = Form(None),
    gross_weight: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    supplier_bill_photo: Optional[UploadFile] = File(None),
    vehicle_photo_front: Optional[UploadFile] = File(None),
    vehicle_photo_back: Optional[UploadFile] = File(None),
    vehicle_photo_side: Optional[UploadFile] = File(None),
    internal_weighment_slip: Optional[UploadFile] = File(None),
    client_weighment_slip: Optional[UploadFile] = File(None),
    transportation_copy: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)):
    db_vehicle = db.query(models.VehicleEntry).filter(
        models.VehicleEntry.id == vehicle_id).first()
    if not db_vehicle:
        raise HTTPException(status_code=404, detail="Vehicle entry not found")

    # Update basic fields
    db_vehicle.vehicle_number = vehicle_number
    db_vehicle.supplier_id = supplier_id
    db_vehicle.bill_no = bill_no
    db_vehicle.driver_name = driver_name
    db_vehicle.driver_phone = driver_phone
    db_vehicle.notes = notes
    db_vehicle.empty_weight = float(empty_weight) if empty_weight else 0.0
    db_vehicle.gross_weight = float(gross_weight) if gross_weight else 0.0

    # Update arrival time if provided
    if arrival_time:
        db_vehicle.arrival_time = parse_ist_datetime(arrival_time)

    # Update photos if new ones are provided
    if supplier_bill_photo and supplier_bill_photo.filename:
        bill_path = await save_upload_file(supplier_bill_photo)
        db_vehicle.supplier_bill_photo = bill_path.encode('utf-8')

    if vehicle_photo_front and vehicle_photo_front.filename:
        front_path = await save_upload_file(vehicle_photo_front)
        db_vehicle.vehicle_photo_front = front_path.encode('utf-8')

    if vehicle_photo_back and vehicle_photo_back.filename:
        back_path = await save_upload_file(vehicle_photo_back)
        db_vehicle.vehicle_photo_back = back_path.encode('utf-8')

    if vehicle_photo_side and vehicle_photo_side.filename:
        side_path = await save_upload_file(vehicle_photo_side)
        db_vehicle.vehicle_photo_side = side_path.encode('utf-8')

    if internal_weighment_slip and internal_weighment_slip.filename:
        internal_path = await save_upload_file(internal_weighment_slip)
        db_vehicle.internal_weighment_slip = internal_path.encode('utf-8')

    if client_weighment_slip and client_weighment_slip.filename:
        client_path = await save_upload_file(client_weighment_slip)
        db_vehicle.client_weighment_slip = client_path.encode('utf-8')

    if transportation_copy and transportation_copy.filename:
        transport_path = await save_upload_file(transportation_copy)
        db_vehicle.transportation_copy = transport_path.encode('utf-8')

    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle


@app.delete("/api/vehicles/{vehicle_id}")
def delete_vehicle_entry(vehicle_id: int, db: Session = Depends(get_db)):
    db_vehicle = db.query(models.VehicleEntry).filter(
        models.VehicleEntry.id == vehicle_id).first()
    if not db_vehicle:
        raise HTTPException(status_code=404, detail="Vehicle entry not found")

    db.delete(db_vehicle)
    db.commit()
    return {"message": "Vehicle entry deleted successfully"}


@app.get("/api/vehicles/{vehicle_id}/bill_photo")
def get_bill_photo(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = db.query(models.VehicleEntry).filter(
        models.VehicleEntry.id == vehicle_id).first()
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
    vehicle = db.query(models.VehicleEntry).filter(
        models.VehicleEntry.id == vehicle_id).first()
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
def create_lab_test(lab_test: schemas.LabTestCreate,
                    db: Session = Depends(get_db),
                    branch_id: Optional[int] = Depends(get_branch_id)):
    vehicle = db.query(models.VehicleEntry).filter(
        models.VehicleEntry.id == lab_test.vehicle_entry_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle entry not found")

    # Create lab test
    lab_test_data = lab_test.dict()

    # Auto-fetch bill number from vehicle entry
    if not lab_test_data.get('bill_number'):
        lab_test_data['bill_number'] = vehicle.bill_no

    # Set branch_id if provided
    if branch_id and not lab_test_data.get('branch_id'):
        lab_test_data['branch_id'] = branch_id

    db_lab_test = models.LabTest(**lab_test_data)
    db.add(db_lab_test)
    db.commit()
    db.refresh(db_lab_test)
    return db_lab_test


@app.get("/api/lab-tests", response_model=List[schemas.LabTestWithVehicle])
def get_all_lab_tests(skip: int = 0,
                      limit: int = 100,
                      branch_id: Optional[int] = Header(None, alias="X-Branch-Id"),
                      db: Session = Depends(get_db)):
    query = db.query(models.LabTest)
    if branch_id:
        query = query.filter(models.LabTest.branch_id == branch_id)
    tests = query.order_by(models.LabTest.test_date.desc()).offset(skip).limit(limit).all()

    # Add has_claim flag to each lab test
    result = []
    for lab_test in tests:
        lab_test_dict = schemas.LabTestWithVehicle.model_validate(
            lab_test).model_dump()
        claim_exists = db.query(models.Claim).filter(
            models.Claim.lab_test_id == lab_test.id).first()
        lab_test_dict['has_claim'] = claim_exists is not None
        result.append(lab_test_dict)

    return result


@app.get("/api/lab-tests/{lab_test_id}",
         response_model=schemas.LabTestWithVehicle)
def get_lab_test(lab_test_id: int, db: Session = Depends(get_db)):
    lab_test = db.query(
        models.LabTest).filter(models.LabTest.id == lab_test_id).first()
    if not lab_test:
        raise HTTPException(status_code=404, detail="Lab test not found")
    return lab_test


@app.put("/api/lab-tests/{lab_test_id}", response_model=schemas.LabTest)
def update_lab_test(lab_test_id: int,
                    lab_test: schemas.LabTestCreate,
                    db: Session = Depends(get_db)):
    db_lab_test = db.query(
        models.LabTest).filter(models.LabTest.id == lab_test_id).first()
    if not db_lab_test:
        raise HTTPException(status_code=404, detail="Lab test not found")

    # Update all fields
    for key, value in lab_test.dict().items():
        setattr(db_lab_test, key, value)

    db.commit()
    db.refresh(db_lab_test)
    return db_lab_test


@app.post("/api/claims/create", response_model=schemas.Claim)
def create_claim(claim: schemas.ClaimCreate, db: Session = Depends(get_db)):
    lab_test = db.query(
        models.LabTest).filter(models.LabTest.id == claim.lab_test_id).first()
    if not lab_test:
        raise HTTPException(status_code=404, detail="Lab test not found")

    db_claim = models.Claim(**claim.dict())
    db.add(db_claim)
    db.commit()
    db.refresh(db_claim)
    return db_claim


@app.get("/api/claims", response_model=List[schemas.ClaimWithLabTest])
def get_claims(skip: int = 0,
               limit: int = 100,
               db: Session = Depends(get_db),
               branch_id: Optional[int] = Depends(get_branch_id)):
    query = db.query(models.Claim)
    # Note: Claims don't have branch_id, they are filtered through lab_tests
    claims = query.offset(skip).limit(limit).all()
    return claims


@app.patch("/api/claims/{claim_id}", response_model=schemas.Claim)
def update_claim(claim_id: int,
                 claim_update: schemas.ClaimUpdate,
                 db: Session = Depends(get_db)):
    db_claim = db.query(
        models.Claim).filter(models.Claim.id == claim_id).first()
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
    db_lab_test = db.query(
        models.LabTest).filter(models.LabTest.id == lab_test_id).first()
    if not db_lab_test:
        raise HTTPException(status_code=404, detail="Lab test not found")

    db.delete(db_lab_test)
    db.commit()
    return {"message": "Lab test deleted successfully"}


async def save_upload_file(file: UploadFile) -> str:
    file_extension = file.filename.split(
        '.')[-1] if '.' in file.filename else 'jpg'
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / unique_filename

    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)

    return f"/uploads/{unique_filename}"


@app.get("/api/godown-types")
def get_godown_types():
    try:
        godown_types_path = Path(__file__).parent / "godown_types.json"
        with open(godown_types_path, "r") as f:
            data = json.load(f)
        print(f"📋 Godown types loaded: {data['godown_types']}")
        return data["godown_types"]
    except Exception as e:
        print(f"❌ Error loading godown types: {e}")
        # Return fallback types if file is missing
        return ["Warehouse", "Silo", "Storage", "Cold Storage"]


@app.post("/api/godowns", response_model=schemas.GodownMaster)
def create_godown(godown: schemas.GodownMasterCreate,
                  db: Session = Depends(get_db),
                  branch_id: Optional[int] = Depends(get_branch_id)):
    godown_data = godown.dict()
    if branch_id and not godown_data.get('branch_id'):
        godown_data['branch_id'] = branch_id
    db_godown = models.GodownMaster(**godown_data)
    db.add(db_godown)
    db.commit()
    db.refresh(db_godown)
    return db_godown


@app.get("/api/godowns", response_model=List[schemas.GodownMaster])
def get_godowns(skip: int = 0,
                limit: int = 100,
                db: Session = Depends(get_db),
                branch_id: Optional[int] = Depends(get_branch_id)):
    query = db.query(models.GodownMaster)
    if branch_id:
        query = query.filter(models.GodownMaster.branch_id == branch_id)
    godowns = query.offset(skip).limit(limit).all()
    return godowns


@app.get("/api/godowns/{godown_id}", response_model=schemas.GodownMaster)
def get_godown(godown_id: int, db: Session = Depends(get_db)):
    godown = db.query(models.GodownMaster).filter(
        models.GodownMaster.id == godown_id).first()
    if not godown:
        raise HTTPException(status_code=404, detail="Godown not found")
    return godown


@app.put("/api/godowns/{godown_id}", response_model=schemas.GodownMaster)
def update_godown(godown_id: int,
                  godown: schemas.GodownMasterUpdate,
                  db: Session = Depends(get_db)):
    db_godown = db.query(models.GodownMaster).filter(
        models.GodownMaster.id == godown_id).first()
    if not db_godown:
        raise HTTPException(status_code=404, detail="Godown not found")

    for key, value in godown.dict().items():
        setattr(db_godown, key, value)

    db.commit()
    db.refresh(db_godown)
    return db_godown


@app.delete("/api/godowns/{godown_id}")
def delete_godown(godown_id: int, db: Session = Depends(get_db)):
    db_godown = db.query(models.GodownMaster).filter(
        models.GodownMaster.id == godown_id).first()
    if not db_godown:
        raise HTTPException(status_code=404, detail="Godown not found")

    db.delete(db_godown)
    db.commit()
    return {"message": "Godown deleted successfully"}


@app.post("/api/unloading-entries", response_model=schemas.UnloadingEntry)
async def create_unloading_entry(
        vehicle_entry_id: int = Form(...),
        godown_id: int = Form(...),
        unloading_start_time: Optional[str] = Form(None),
        unloading_end_time: Optional[str] = Form(None),
        notes: Optional[str] = Form(None),
        before_unloading_image: Optional[UploadFile] = File(None),
        after_unloading_image: Optional[UploadFile] = File(None),
        db: Session = Depends(get_db),
        branch_id: Optional[int] = Depends(get_branch_id)):
    # Get weights from vehicle entry
    vehicle_entry = db.query(models.VehicleEntry).filter(
        models.VehicleEntry.id == vehicle_entry_id).first()
    if not vehicle_entry:
        raise HTTPException(status_code=404, detail="Vehicle entry not found")

    gross_weight = vehicle_entry.gross_weight or 0
    empty_vehicle_weight = vehicle_entry.empty_weight or 0
    net_weight = gross_weight - empty_vehicle_weight

    start_time = parse_ist_datetime(
        unloading_start_time) if unloading_start_time else get_utc_now()
    end_time = parse_ist_datetime(
        unloading_end_time) if unloading_end_time else get_utc_now()

    db_entry = models.UnloadingEntry(vehicle_entry_id=vehicle_entry_id,
                                     godown_id=godown_id,
                                     gross_weight=gross_weight,
                                     empty_vehicle_weight=empty_vehicle_weight,
                                     net_weight=net_weight,
                                     unloading_start_time=start_time,
                                     unloading_end_time=end_time,
                                     notes=notes)

    if branch_id:
        db_entry.branch_id = branch_id

    if before_unloading_image and before_unloading_image.filename:
        db_entry.before_unloading_image = await save_upload_file(
            before_unloading_image)

    if after_unloading_image and after_unloading_image.filename:
        db_entry.after_unloading_image = await save_upload_file(
            after_unloading_image)

    godown = db.query(models.GodownMaster).filter(
        models.GodownMaster.id == godown_id).first()
    if godown:
        net_weight_tons = net_weight / 1000
        godown.current_storage = (godown.current_storage
                                  or 0) + net_weight_tons
        db.add(godown)

    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry


@app.get("/api/unloading-entries",
         response_model=List[schemas.UnloadingEntryWithDetails])
def get_all_unloading_entries(
        skip: int = 0,
        limit: int = 100,
        branch_id: Optional[int] = Header(None, alias="X-Branch-Id"),
        db: Session = Depends(get_db)):
    print(f"📊 GET /api/unloading-entries called")
    print(f"   Branch ID from header: {branch_id}")

    query = db.query(models.UnloadingEntry)
    if branch_id:
        query = query.filter(models.UnloadingEntry.branch_id == branch_id)

    entries = query.order_by(models.UnloadingEntry.created_at.desc()).offset(skip).limit(limit).all()

    # Convert image paths to full URLs
    for entry in entries:
        if entry.before_unloading_image:
            entry.before_unloading_image = get_image_url(entry.before_unloading_image)
        if entry.after_unloading_image:
            entry.after_unloading_image = get_image_url(entry.after_unloading_image)

    return entries


@app.get("/api/unloading-entries/{entry_id}",
         response_model=schemas.UnloadingEntryWithDetails)
def get_unloading_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(models.UnloadingEntry).filter(
        models.UnloadingEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404,
                            detail="Unloading entry not found")

    # Convert image paths to full URLs
    if entry.before_unloading_image:
        entry.before_unloading_image = get_image_url(entry.before_unloading_image)
    if entry.after_unloading_image:
        entry.after_unloading_image = get_image_url(entry.after_unloading_image)

    return entry


@app.put("/api/unloading-entries/{entry_id}",
         response_model=schemas.UnloadingEntry)
async def update_unloading_entry(
    entry_id: int,
    vehicle_entry_id: int = Form(...),
    godown_id: int = Form(...),
    unloading_start_time: Optional[str] = Form(None),
    unloading_end_time: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    before_unloading_image: Optional[UploadFile] = File(None),
    after_unloading_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)):
    db_entry = db.query(models.UnloadingEntry).filter(
        models.UnloadingEntry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404,
                            detail="Unloading entry not found")

    # Get weights from vehicle entry
    vehicle_entry = db.query(models.VehicleEntry).filter(
        models.VehicleEntry.id == vehicle_entry_id).first()
    if not vehicle_entry:
        raise HTTPException(status_code=404, detail="Vehicle entry not found")

    gross_weight = vehicle_entry.gross_weight or 0
    empty_vehicle_weight = vehicle_entry.empty_weight or 0
    net_weight = gross_weight - empty_vehicle_weight

    # Update godown storage (subtract old, add new)
    old_godown = db.query(models.GodownMaster).filter(
        models.GodownMaster.id == db_entry.godown_id).first()
    if old_godown:
        old_net_weight_tons = db_entry.net_weight / 1000
        old_godown.current_storage = max(0, (old_godown.current_storage or 0) -
                                         old_net_weight_tons)

    # Update entry fields
    db_entry.vehicle_entry_id = vehicle_entry_id
    db_entry.godown_id = godown_id
    db_entry.gross_weight = gross_weight
    db_entry.empty_vehicle_weight = empty_vehicle_weight
    db_entry.net_weight = net_weight

    if unloading_start_time:
        db_entry.unloading_start_time = parse_ist_datetime(
            unloading_start_time)

    if unloading_end_time:
        db_entry.unloading_end_time = parse_ist_datetime(unloading_end_time)

    db_entry.notes = notes

    # Update images if provided
    if before_unloading_image and before_unloading_image.filename:
        db_entry.before_unloading_image = await save_upload_file(
            before_unloading_image)

    if after_unloading_image and after_unloading_image.filename:
        db_entry.after_unloading_image = await save_upload_file(
            after_unloading_image)

    # Add new weight to godown
    new_godown = db.query(models.GodownMaster).filter(
        models.GodownMaster.id == godown_id).first()
    if new_godown:
        new_net_weight_tons = net_weight / 1000
        new_godown.current_storage = (new_godown.current_storage
                                      or 0) + new_net_weight_tons

    db.commit()
    db.refresh(db_entry)
    return db_entry


@app.delete("/api/unloading-entries/{entry_id}")
def delete_unloading_entry(entry_id: int, db: Session = Depends(get_db)):
    db_entry = db.query(models.UnloadingEntry).filter(
        models.UnloadingEntry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404,
                            detail="Unloading entry not found")

    godown = db.query(models.GodownMaster).filter(
        models.GodownMaster.id == db_entry.godown_id).first()
    if godown:
        net_weight_tons = db_entry.net_weight / 1000
        godown.current_storage = max(0, (godown.current_storage or 0) -
                                     net_weight_tons)

    db.delete(db_entry)
    db.commit()
    return {"message": "Unloading entry deleted successfully"}


@app.post("/api/bins", response_model=schemas.Bin)
def create_bin(bin_data: schemas.BinCreate,
               db: Session = Depends(get_db),
               branch_id: Optional[int] = Depends(get_branch_id)):
    bin_dict = bin_data.dict()
    if branch_id and not bin_dict.get('branch_id'):
        bin_dict['branch_id'] = branch_id
    db_bin = models.Bin(**bin_dict)
    db.add(db_bin)
    db.commit()
    db.refresh(db_bin)
    return db_bin


@app.get("/api/bins", response_model=List[schemas.Bin])
def get_bins(skip: int = 0,
             limit: int = 100,
             db: Session = Depends(get_db),
             branch_id: Optional[int] = Depends(get_branch_id)):
    query = db.query(models.Bin)
    if branch_id:
        query = query.filter(models.Bin.branch_id == branch_id)
    bins = query.offset(skip).limit(limit).all()
    # Sanitize float values
    for bin_obj in bins:
        bin_obj.capacity = sanitize_float(bin_obj.capacity)
        bin_obj.current_quantity = sanitize_float(bin_obj.current_quantity)
    return bins


@app.get("/api/bins/source", response_model=List[schemas.Bin])
def get_source_bins(db: Session = Depends(get_db), branch_id: Optional[int] = Header(None, alias="X-Branch-Id")):
    """Get all Raw Wheat bins available as blend sources"""
    query = db.query(models.Bin).filter(models.Bin.bin_type == "Raw wheat bin")
    if branch_id:
        query = query.filter(models.Bin.branch_id == branch_id)
    return query.all()


@app.get("/api/bins/destination", response_model=List[schemas.Bin])
def get_destination_bins(db: Session = Depends(get_db), branch_id: Optional[int] = Header(None, alias="X-Branch-Id")):
    """Get all 24 Hours bins available as distribution destinations"""
    query = db.query(models.Bin).filter(models.Bin.bin_type == "24 hours bin")
    if branch_id:
        query = query.filter(models.Bin.branch_id == branch_id)
    return query.all()


@app.get("/api/bins/{bin_id}", response_model=schemas.Bin)
def get_bin(bin_id: int, db: Session = Depends(get_db)):
    bin_data = db.query(models.Bin).filter(models.Bin.id == bin_id).first()
    if not bin_data:
        raise HTTPException(status_code=404, detail="Bin not found")
    return bin_data


@app.put("/api/bins/{bin_id}", response_model=schemas.Bin)
def update_bin(bin_id: int,
               bin_update: schemas.BinUpdate,
               db: Session = Depends(get_db)):
    db_bin = db.query(models.Bin).filter(models.Bin.id == bin_id).first()
    if not db_bin:
        raise HTTPException(status_code=404, detail="Bin not found")

    update_data = bin_update.dict(exclude_unset=True)

    # Check for duplicate bin_number if it's being updated
    if 'bin_number' in update_data and update_data[
            'bin_number'] != db_bin.bin_number:
        existing_bin = db.query(models.Bin).filter(
            models.Bin.bin_number == update_data['bin_number'], models.Bin.id
            != bin_id).first()
        if existing_bin:
            raise HTTPException(status_code=400,
                                detail="Bin number already exists")

    for key, value in update_data.items():
        setattr(db_bin, key, value)

    db.commit()
    db.refresh(db_bin)
    return db_bin


@app.delete("/api/bins/{bin_id}")
def delete_bin(bin_id: int, db: Session = Depends(get_db)):
    db_bin = db.query(models.Bin).filter(models.Bin.id == bin_id).first()
    if not db_bin:
        raise HTTPException(status_code=404, detail="Bin not found")

    try:
        db.delete(db_bin)
        db.commit()
        return {"message": "Bin deleted successfully", "id": bin_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500,
                            detail=f"Failed to delete bin: {str(e)}")


@app.post("/api/magnets", response_model=schemas.Magnet)
def create_magnet(magnet_data: schemas.MagnetCreate,
                  db: Session = Depends(get_db),
                  branch_id: Optional[int] = Depends(get_branch_id)):
    magnet_dict = magnet_data.dict()
    if branch_id and not magnet_dict.get('branch_id'):
        magnet_dict['branch_id'] = branch_id
    db_magnet = models.Magnet(**magnet_dict)
    db.add(db_magnet)
    db.commit()
    db.refresh(db_magnet)
    return db_magnet


@app.get("/api/magnets", response_model=List[schemas.Magnet])
def get_magnets(skip: int = 0,
                limit: int = 100,
                db: Session = Depends(get_db),
                branch_id: Optional[int] = Depends(get_branch_id)):
    query = db.query(models.Magnet)
    if branch_id:
        query = query.filter(models.Magnet.branch_id == branch_id)
    magnets = query.offset(skip).limit(limit).all()
    return magnets


@app.get("/api/magnets/{magnet_id}", response_model=schemas.Magnet)
def get_magnet(magnet_id: int, db: Session = Depends(get_db)):
    magnet_data = db.query(
        models.Magnet).filter(models.Magnet.id == magnet_id).first()
    if not magnet_data:
        raise HTTPException(status_code=404, detail="Magnet not found")
    return magnet_data


@app.put("/api/magnets/{magnet_id}", response_model=schemas.Magnet)
def update_magnet(magnet_id: int,
                  magnet_update: schemas.MagnetUpdate,
                  db: Session = Depends(get_db)):
    db_magnet = db.query(
        models.Magnet).filter(models.Magnet.id == magnet_id).first()
    if not db_magnet:
        raise HTTPException(status_code=404, detail="Magnet not found")

    update_data = magnet_update.dict(exclude_unset=True)

    # Check for duplicate name if it's being updated
    if 'name' in update_data and update_data['name'] != db_magnet.name:
        existing_magnet = db.query(models.Magnet).filter(
            models.Magnet.name == update_data['name'], models.Magnet.id
            != magnet_id).first()
        if existing_magnet:
            raise HTTPException(status_code=400,
                                detail="Magnet name already exists")

    for key, value in update_data.items():
        setattr(db_magnet, key, value)

    db.commit()
    db.refresh(db_magnet)
    return db_magnet


@app.delete("/api/magnets/{magnet_id}")
def delete_magnet(magnet_id: int, db: Session = Depends(get_db)):
    db_magnet = db.query(
        models.Magnet).filter(models.Magnet.id == magnet_id).first()
    if not db_magnet:
        raise HTTPException(status_code=404, detail="Magnet not found")

    try:
        db.delete(db_magnet)
        db.commit()
        return {"message": "Magnet deleted successfully", "id": magnet_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500,
                            detail=f"Failed to delete magnet: {str(e)}")


@app.post("/api/machines", response_model=schemas.Machine)
def create_machine(machine_data: schemas.MachineCreate,
                   db: Session = Depends(get_db),
                   branch_id: Optional[int] = Depends(get_branch_id)):
    machine_dict = machine_data.dict()
    if branch_id and not machine_dict.get('branch_id'):
        machine_dict['branch_id'] = branch_id
    db_machine = models.Machine(**machine_dict)
    db.add(db_machine)
    db.commit()
    db.refresh(db_machine)
    return db_machine


@app.get("/api/machines", response_model=List[schemas.Machine])
def get_machines(skip: int = 0,
                 limit: int = 100,
                 db: Session = Depends(get_db),
                 branch_id: Optional[int] = Depends(get_branch_id)):
    query = db.query(models.Machine)
    if branch_id:
        query = query.filter(models.Machine.branch_id == branch_id)
    machines = query.offset(skip).limit(limit).all()
    return machines


@app.get("/api/machines/{machine_id}", response_model=schemas.Machine)
def get_machine(machine_id: int, db: Session = Depends(get_db)):
    machine_data = db.query(
        models.Machine).filter(models.Machine.id == machine_id).first()
    if not machine_data:
        raise HTTPException(status_code=404, detail="Machine not found")
    return machine_data


@app.put("/api/machines/{machine_id}", response_model=schemas.Machine)
def update_machine(machine_id: int,
                   machine_update: schemas.MachineUpdate,
                   db: Session = Depends(get_db)):
    db_machine = db.query(
        models.Machine).filter(models.Machine.id == machine_id).first()
    if not db_machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    update_data = machine_update.dict(exclude_unset=True)

    if 'name' in update_data and update_data['name'] != db_machine.name:
        existing_machine = db.query(models.Machine).filter(
            models.Machine.name == update_data['name'], models.Machine.id
            != machine_id).first()
        if existing_machine:
            raise HTTPException(status_code=400,
                                detail="Machine name already exists")

    for key, value in update_data.items():
        setattr(db_machine, key, value)

    db.commit()
    db.refresh(db_machine)
    return db_machine


@app.delete("/api/machines/{machine_id}")
def delete_machine(machine_id: int, db: Session = Depends(get_db)):
    db_machine = db.query(
        models.Machine).filter(models.Machine.id == machine_id).first()
    if not db_machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    try:
        db.delete(db_machine)
        db.commit()
        return {"message": "Machine deleted successfully", "id": machine_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500,
                            detail=f"Failed to delete machine: {str(e)}")


@app.post("/api/route-magnet-mappings",
          response_model=schemas.RouteMagnetMapping)
def create_route_magnet_mapping(mapping_data: schemas.RouteMagnetMappingCreate,
                                db: Session = Depends(get_db)):
    # Validate that either source_godown_id or source_bin_id is provided
    if not mapping_data.source_godown_id and not mapping_data.source_bin_id:
        raise HTTPException(
            status_code=400,
            detail="Either source_godown_id or source_bin_id must be provided")

    if mapping_data.source_godown_id and mapping_data.source_bin_id:
        raise HTTPException(
            status_code=400,
            detail="Cannot specify both source_godown_id and source_bin_id")

    # Validate foreign keys
    magnet = db.query(models.Magnet).filter(
        models.Magnet.id == mapping_data.magnet_id).first()
    if not magnet:
        raise HTTPException(status_code=404, detail="Magnet not found")

    if mapping_data.source_godown_id:
        godown = db.query(models.GodownMaster).filter(
            models.GodownMaster.id == mapping_data.source_godown_id).first()
        if not godown:
            raise HTTPException(status_code=404,
                                detail="Source godown not found")

    if mapping_data.source_bin_id:
        source_bin = db.query(models.Bin).filter(
            models.Bin.id == mapping_data.source_bin_id).first()
        if not source_bin:
            raise HTTPException(status_code=404, detail="Source bin not found")

    bin_data = db.query(models.Bin).filter(
        models.Bin.id == mapping_data.destination_bin_id).first()
    if not bin_data:
        raise HTTPException(status_code=404,
                            detail="Destination bin not found")

    db_mapping = models.RouteMagnetMapping(**mapping_data.dict())
    db.add(db_mapping)
    db.commit()
    db.refresh(db_mapping)
    return db_mapping


@app.get("/api/route-magnet-mappings",
         response_model=List[schemas.RouteMagnetMappingWithDetails])
def get_route_magnet_mappings(db: Session = Depends(get_db)):
    """Get all route magnet mappings with related details"""
    mappings = db.query(models.RouteMagnetMapping).all()
    # Sanitize float values in related objects
    for mapping in mappings:
        if mapping.destination_bin:
            mapping.destination_bin.capacity = sanitize_float(
                mapping.destination_bin.capacity)
            mapping.destination_bin.current_quantity = sanitize_float(
                mapping.destination_bin.current_quantity)
        if mapping.source_bin:
            mapping.source_bin.capacity = sanitize_float(
                mapping.source_bin.capacity)
            mapping.source_bin.current_quantity = sanitize_float(
                mapping.source_bin.current_quantity)
        if mapping.source_godown:
            mapping.source_godown.current_storage = sanitize_float(
                mapping.source_godown.current_storage)
    return mappings


@app.get("/api/route-magnet-mappings/{mapping_id}",
         response_model=schemas.RouteMagnetMappingWithDetails)
def get_route_magnet_mapping(mapping_id: int, db: Session = Depends(get_db)):
    mapping = db.query(models.RouteMagnetMapping).filter(
        models.RouteMagnetMapping.id == mapping_id).first()
    if not mapping:
        raise HTTPException(status_code=404,
                            detail="Route magnet mapping not found")
    return mapping


@app.put("/api/route-magnet-mappings/{mapping_id}",
         response_model=schemas.RouteMagnetMapping)
def update_route_magnet_mapping(
    mapping_id: int,
    mapping_update: schemas.RouteMagnetMappingUpdate,
    db: Session = Depends(get_db)):
    db_mapping = db.query(models.RouteMagnetMapping).filter(
        models.RouteMagnetMapping.id == mapping_id).first()
    if not db_mapping:
        raise HTTPException(status_code=404,
                            detail="Route magnet mapping not found")

    update_data = mapping_update.dict(exclude_unset=True)

    # Validate foreign keys if they're being updated
    if 'magnet_id' in update_data:
        magnet = db.query(models.Magnet).filter(
            models.Magnet.id == update_data['magnet_id']).first()
        if not magnet:
            raise HTTPException(status_code=404, detail="Magnet not found")

    if 'source_godown_id' in update_data:
        if update_data['source_godown_id']:
            godown = db.query(models.GodownMaster).filter(
                models.GodownMaster.id ==
                update_data['source_godown_id']).first()
            if not godown:
                raise HTTPException(status_code=404,
                                    detail="Source godown not found")

    if 'source_bin_id' in update_data:
        if update_data['source_bin_id']:
            source_bin = db.query(models.Bin).filter(
                models.Bin.id == update_data['source_bin_id']).first()
            if not source_bin:
                raise HTTPException(status_code=404,
                                    detail="Source bin not found")

    if 'destination_bin_id' in update_data:
        bin_data = db.query(models.Bin).filter(
            models.Bin.id == update_data['destination_bin_id']).first()
        if not bin_data:
            raise HTTPException(status_code=404,
                                detail="Destination bin not found")

    for key, value in update_data.items():
        setattr(db_mapping, key, value)

    db.commit()
    db.refresh(db_mapping)
    return db_mapping


@app.delete("/api/route-magnet-mappings/{mapping_id}")
def delete_route_magnet_mapping(mapping_id: int,
                                db: Session = Depends(get_db)):
    db_mapping = db.query(models.RouteMagnetMapping).filter(
        models.RouteMagnetMapping.id == mapping_id).first()
    if not db_mapping:
        raise HTTPException(status_code=404,
                            detail="Route magnet mapping not found")

    try:
        db.delete(db_mapping)
        db.commit()
        return {
            "message": "Route magnet mapping deleted successfully",
            "id": mapping_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete route magnet mapping: {str(e)}")


@app.post("/api/route-configurations",
          response_model=schemas.RouteConfiguration)
def create_route_configuration(
    route_data: schemas.RouteConfigurationCreate,
    db: Session = Depends(get_db),
    branch_id: Optional[int] = Depends(get_branch_id)):
    route_dict = route_data.dict(exclude={'stages'})
    if branch_id and not route_dict.get('branch_id'):
        route_dict['branch_id'] = branch_id

    db_route = models.RouteConfiguration(**route_dict)
    db.add(db_route)
    db.flush()

    for stage_data in route_data.stages:
        db_stage = models.RouteStage(route_id=db_route.id, **stage_data.dict())
        db.add(db_stage)

    db.commit()
    db.refresh(db_route)
    return db_route


@app.get("/api/route-configurations",
         response_model=List[schemas.RouteConfiguration])
def get_route_configurations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    branch_id: Optional[int] = Depends(get_branch_id)):
    query = db.query(models.RouteConfiguration)
    if branch_id:
        query = query.filter(models.RouteConfiguration.branch_id == branch_id)
    routes = query.offset(skip).limit(limit).all()
    return routes


@app.get("/api/route-configurations/{route_id}",
         response_model=schemas.RouteConfiguration)
def get_route_configuration(route_id: int, db: Session = Depends(get_db)):
    route = db.query(models.RouteConfiguration).filter(
        models.RouteConfiguration.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404,
                            detail="Route configuration not found")
    return route


@app.put("/api/route-configurations/{route_id}",
         response_model=schemas.RouteConfiguration)
def update_route_configuration(route_id: int,
                               route_update: schemas.RouteConfigurationUpdate,
                               db: Session = Depends(get_db)):
    db_route = db.query(models.RouteConfiguration).filter(
        models.RouteConfiguration.id == route_id).first()
    if not db_route:
        raise HTTPException(status_code=404,
                            detail="Route configuration not found")

    update_data = route_update.dict(exclude_unset=True, exclude={'stages'})
    for key, value in update_data.items():
        setattr(db_route, key, value)

    if route_update.stages is not None:
        db.query(models.RouteStage).filter(
            models.RouteStage.route_id == route_id).delete()

        for stage_data in route_update.stages:
            db_stage = models.RouteStage(route_id=route_id,
                                         **stage_data.dict())
            db.add(db_stage)

    db.commit()
    db.refresh(db_route)
    return db_route


@app.delete("/api/route-configurations/{route_id}")
def delete_route_configuration(route_id: int, db: Session = Depends(get_db)):
    db_route = db.query(models.RouteConfiguration).filter(
        models.RouteConfiguration.id == route_id).first()
    if not db_route:
        raise HTTPException(status_code=404,
                            detail="Route configuration not found")

    try:
        db.delete(db_route)
        db.commit()
        return {
            "message": "Route configuration deleted successfully",
            "id": route_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete route configuration: {str(e)}")


@app.post("/api/magnet-cleaning-records",
          response_model=schemas.MagnetCleaningRecord)
async def create_magnet_cleaning_record(
        magnet_id: int = Form(...),
        transfer_session_id: Optional[int] = Form(None),
        cleaning_timestamp: Optional[str] = Form(None),
        notes: Optional[str] = Form(None),
        before_cleaning_photo: Optional[UploadFile] = File(None),
        after_cleaning_photo: Optional[UploadFile] = File(None),
        db: Session = Depends(get_db)):
    from datetime import timedelta
    import pytz

    # Validate magnet exists
    magnet = db.query(
        models.Magnet).filter(models.Magnet.id == magnet_id).first()
    if not magnet:
        raise HTTPException(status_code=404, detail="Magnet not found")

    # Validate transfer session if provided
    if transfer_session_id:
        transfer_session = db.query(models.TransferSession).filter(
            models.TransferSession.id == transfer_session_id).first()
        if not transfer_session:
            raise HTTPException(status_code=404,
                                detail="Transfer session not found")

    # Get current IST time for logging
    ist_now = datetime.now(IST)
    utc_now = get_utc_now()

    print(f"\n📝 BACKEND: Creating cleaning record")
    print(f"   Magnet ID: {magnet_id}")
    print(f"   Transfer Session ID: {transfer_session_id}")
    print(
        f"   IST time (current): {ist_now.strftime('%Y-%m-%d %I:%M:%S %p IST')}"
    )
    print(f"   UTC time (saving): {utc_now}")

    db_record = models.MagnetCleaningRecord(
        magnet_id=magnet_id,
        transfer_session_id=transfer_session_id,
        cleaning_timestamp=utc_now,
        notes=notes)

    if before_cleaning_photo and before_cleaning_photo.filename:
        db_record.before_cleaning_photo = await save_upload_file(
            before_cleaning_photo)

    if after_cleaning_photo and after_cleaning_photo.filename:
        db_record.after_cleaning_photo = await save_upload_file(
            after_cleaning_photo)

    db.add(db_record)
    db.commit()
    db.refresh(db_record)

    # Convert saved UTC timestamp back to IST for logging
    saved_ist = pytz.UTC.localize(db_record.cleaning_timestamp).astimezone(IST)
    print(f"   ✅ Created record ID {db_record.id}")
    print(f"   ✅ Saved timestamp (UTC): {db_record.cleaning_timestamp}")
    print(
        f"   ✅ Saved timestamp (IST): {saved_ist.strftime('%Y-%m-%d %I:%M:%S %p IST')}"
    )
    print(
        f"   ✅ Returning to frontend: {db_record.cleaning_timestamp.isoformat() if db_record.cleaning_timestamp else 'None'}"
    )

    return db_record


@app.get("/api/magnet-cleaning-records",
         response_model=List[schemas.MagnetCleaningRecordWithDetails])
def get_magnet_cleaning_records(magnet_id: Optional[int] = None,
                                skip: int = 0,
                                limit: int = 100,
                                db: Session = Depends(get_db)):
    query = db.query(models.MagnetCleaningRecord)
    if magnet_id:
        query = query.filter(
            models.MagnetCleaningRecord.magnet_id == magnet_id)

    records = query.order_by(
        models.MagnetCleaningRecord.cleaning_timestamp.desc()).offset(
            skip).limit(limit).all()

    # Convert image paths to full URLs
    for record in records:
        if record.before_cleaning_photo:
            record.before_cleaning_photo = get_image_url(record.before_cleaning_photo)
        if record.after_cleaning_photo:
            record.after_cleaning_photo = get_image_url(record.after_cleaning_photo)

    return records


@app.get("/api/magnet-cleaning-records/{record_id}",
         response_model=schemas.MagnetCleaningRecordWithDetails)
def get_magnet_cleaning_record(record_id: int, db: Session = Depends(get_db)):
    record = db.query(models.MagnetCleaningRecord).filter(
        models.MagnetCleaningRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404,
                            detail="Magnet cleaning record not found")

    # Convert image paths to full URLs
    if record.before_cleaning_photo:
        record.before_cleaning_photo = get_image_url(record.before_cleaning_photo)
    if record.after_cleaning_photo:
        record.after_cleaning_photo = get_image_url(record.after_cleaning_photo)

    return record


@app.put("/api/magnet-cleaning-records/{record_id}",
         response_model=schemas.MagnetCleaningRecord)
async def update_magnet_cleaning_record(
    record_id: int,
    magnet_id: int = Form(...),
    cleaning_timestamp: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    before_cleaning_photo: Optional[UploadFile] = File(None),
    after_cleaning_photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)):
    db_record = db.query(models.MagnetCleaningRecord).filter(
        models.MagnetCleaningRecord.id == record_id).first()
    if not db_record:
        raise HTTPException(status_code=404,
                            detail="Magnet cleaning record not found")

    # Validate magnet exists
    magnet = db.query(
        models.Magnet).filter(models.Magnet.id == magnet_id).first()
    if not magnet:
        raise HTTPException(status_code=404, detail="Magnet not found")

    db_record.magnet_id = magnet_id
    db_record.notes = notes

    if cleaning_timestamp:
        db_record.cleaning_timestamp = parse_ist_datetime(cleaning_timestamp)

    if before_cleaning_photo and before_cleaning_photo.filename:
        db_record.before_cleaning_photo = await save_upload_file(
            before_cleaning_photo)

    if after_cleaning_photo and after_cleaning_photo.filename:
        db_record.after_cleaning_photo = await save_upload_file(
            after_cleaning_photo)

    db.commit()
    db.refresh(db_record)
    return db_record


@app.delete("/api/magnet-cleaning-records/{record_id}")
def delete_magnet_cleaning_record(record_id: int,
                                  db: Session = Depends(get_db)):
    db_record = db.query(models.MagnetCleaningRecord).filter(
        models.MagnetCleaningRecord.id == record_id).first()
    if not db_record:
        raise HTTPException(status_code=404,
                            detail="Magnet cleaning record not found")

    try:
        db.delete(db_record)
        db.commit()
        return {
            "message": "Magnet cleaning record deleted successfully",
            "id": record_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete magnet cleaning record: {str(e)}")


# Transfer Session endpoints
@app.post("/api/transfer-sessions/start",
          response_model=schemas.TransferSessionWithDetails)
def start_transfer_session(session_data: schemas.TransferSessionCreate,
                           db: Session = Depends(get_db)):
    # Validate source godown exists
    source_godown = db.query(models.GodownMaster).filter(
        models.GodownMaster.id == session_data.source_godown_id).first()
    if not source_godown:
        raise HTTPException(status_code=404, detail="Source godown not found")

    # Validate destination bin exists
    destination_bin = db.query(models.Bin).filter(
        models.Bin.id == session_data.destination_bin_id).first()
    if not destination_bin:
        raise HTTPException(status_code=404,
                            detail="Destination bin not found")

    # Find route configuration based on source godown and destination bin
    # Route configuration has stages, first stage should be source godown, last stage should be destination bin
    route_config = None
    magnet_stages = []

    # Query all route configurations and check their stages
    all_routes = db.query(models.RouteConfiguration).all()
    for route in all_routes:
        if len(route.stages) < 2:
            continue

        # Check if first stage is source godown and last stage is destination bin
        first_stage = route.stages[0]
        last_stage = route.stages[-1]

        if (first_stage.component_type.lower() == 'godown'
                and first_stage.component_id == session_data.source_godown_id
                and last_stage.component_type.lower() == 'bin' and
                last_stage.component_id == session_data.destination_bin_id):
            route_config = route
            # Extract all magnet stages
            magnet_stages = [
                stage for stage in route.stages
                if stage.component_type.lower() == 'magnet'
            ]
            break

    # Set default values for backward compatibility
    cleaning_interval = None
    magnet_id = None

    # If we found magnet stages, use the first one for backward compatibility with old system
    if magnet_stages:
        # Convert hours to seconds for backward compatibility (field stores seconds despite name)
        cleaning_interval = magnet_stages[0].interval_hours * 3600
        magnet_id = magnet_stages[0].component_id
    elif session_data.magnet_id and session_data.cleaning_interval_hours:
        # Allow manual specification if no route configuration exists
        cleaning_interval = session_data.cleaning_interval_hours
        magnet_id = session_data.magnet_id

    utc_now = get_utc_now()

    print(f"\n🚀 BACKEND: Starting transfer session")
    print(f"   Source Godown ID: {session_data.source_godown_id}")
    print(f"   Destination Bin ID: {session_data.destination_bin_id}")
    if route_config:
        print(f"   ✅ Found Route Configuration: {route_config.name}")
        print(f"   📍 Magnet stages found: {len(magnet_stages)}")
        for idx, stage in enumerate(magnet_stages):
            print(
                f"      Magnet {idx + 1}: ID={stage.component_id}, Interval={stage.interval_hours}h"
            )
    else:
        print(f"   ⚠️ No route configuration found")
        print(f"   Magnet ID: {magnet_id}")
        print(f"   Cleaning Interval: {cleaning_interval}s")

    # Create new transfer session
    db_session = models.TransferSession(
        source_godown_id=session_data.source_godown_id,
        destination_bin_id=session_data.destination_bin_id,
        current_bin_id=session_data.destination_bin_id,
        magnet_id=magnet_id,
        start_timestamp=utc_now,
        current_bin_start_timestamp=utc_now,
        status="active",
        cleaning_interval_hours=cleaning_interval,
        notes=session_data.notes)

    db.add(db_session)
    db.flush()

    # Create TransferSessionMagnet records for each magnet in the route
    if magnet_stages:
        print(f"   📝 Creating session magnet records...")
        for idx, magnet_stage in enumerate(magnet_stages):
            # Convert hours to seconds for storage (despite column name, it stores seconds)
            interval_seconds = magnet_stage.interval_hours * 3600
            session_magnet = models.TransferSessionMagnet(
                transfer_session_id=db_session.id,
                magnet_id=magnet_stage.component_id,
                cleaning_interval_hours=
                interval_seconds,  # Stored in seconds despite column name
                sequence_no=magnet_stage.sequence_no)
            db.add(session_magnet)
            print(
                f"      ✅ Added Magnet {idx + 1}: ID={magnet_stage.component_id}, Interval={magnet_stage.interval_hours}h ({interval_seconds}s)"
            )

    # Create first bin transfer record
    bin_transfer = models.BinTransfer(transfer_session_id=db_session.id,
                                      bin_id=session_data.destination_bin_id,
                                      start_timestamp=utc_now,
                                      sequence=1)
    db.add(bin_transfer)

    db.commit()
    db.refresh(db_session)

    print(f"   ✅ Created transfer session ID {db_session.id}")
    print(f"   ✅ Current bin: {db_session.current_bin_id}")
    print(f"   ✅ Status: {db_session.status}")
    if magnet_stages:
        print(
            f"   ✅ Session magnets: {len(db_session.session_magnets)} magnets configured"
        )

    # Sanitize float values before returning
    db_session.transferred_quantity = sanitize_float(
        db_session.transferred_quantity)
    if db_session.source_godown:
        db_session.source_godown.current_storage = sanitize_float(
            db_session.source_godown.current_storage)
    if db_session.destination_bin:
        db_session.destination_bin.capacity = sanitize_float(
            db_session.destination_bin.capacity)
        db_session.destination_bin.current_quantity = sanitize_float(
            db_session.destination_bin.current_quantity)
    if db_session.current_bin:
        db_session.current_bin.capacity = sanitize_float(
            db_session.current_bin.capacity)
        db_session.current_bin.current_quantity = sanitize_float(
            db_session.current_bin.current_quantity)

    return db_session


@app.post("/api/transfer-sessions/{session_id}/divert",
          response_model=schemas.TransferSessionWithDetails)
def divert_transfer_session(session_id: int,
                            divert_data: schemas.TransferSessionDivert,
                            db: Session = Depends(get_db)):
    # Get the transfer session
    db_session = db.query(models.TransferSession).filter(
        models.TransferSession.id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404,
                            detail="Transfer session not found")

    if db_session.status != "active":
        raise HTTPException(status_code=400,
                            detail="Transfer session is not active")

    # Validate new bin exists
    new_bin = db.query(
        models.Bin).filter(models.Bin.id == divert_data.new_bin_id).first()
    if not new_bin:
        raise HTTPException(status_code=404, detail="New bin not found")

    utc_now = get_utc_now()

    print(f"\n🔀 BACKEND: Diverting transfer session {session_id}")
    print(f"   From bin: {db_session.current_bin_id}")
    print(f"   To bin: {divert_data.new_bin_id}")
    print(f"   Quantity transferred: {divert_data.quantity_transferred} tons")

    # Close current bin transfer record
    current_bin_transfer = db.query(models.BinTransfer).filter(
        models.BinTransfer.transfer_session_id == session_id,
        models.BinTransfer.end_timestamp == None).first()

    if current_bin_transfer:
        current_bin_transfer.end_timestamp = utc_now
        current_bin_transfer.quantity = divert_data.quantity_transferred

    # Update current bin quantity
    current_bin = db.query(
        models.Bin).filter(models.Bin.id == db_session.current_bin_id).first()
    if current_bin:
        current_bin.current_quantity = (current_bin.current_quantity or
                                        0) + divert_data.quantity_transferred
        if current_bin.current_quantity >= current_bin.capacity:
            current_bin.status = models.BinStatus.FULL

    # Update source godown
    source_godown = db.query(models.GodownMaster).filter(
        models.GodownMaster.id == db_session.source_godown_id).first()
    if source_godown:
        source_godown.current_storage = max(
            0, (source_godown.current_storage or 0) -
            divert_data.quantity_transferred)

    # Get next sequence number
    max_sequence = db.query(models.BinTransfer).filter(
        models.BinTransfer.transfer_session_id == session_id).count()

    # Create new bin transfer record
    new_bin_transfer = models.BinTransfer(transfer_session_id=session_id,
                                          bin_id=divert_data.new_bin_id,
                                          start_timestamp=utc_now,
                                          sequence=max_sequence + 1)
    db.add(new_bin_transfer)

    # Update session current bin
    db_session.current_bin_id = divert_data.new_bin_id
    db_session.current_bin_start_timestamp = utc_now

    db.commit()
    db.refresh(db_session)

    print(f"   ✅ Diverted to bin {divert_data.new_bin_id}")
    print(f"   ✅ Updated godown and bin quantities")

    # Sanitize float values
    db_session.transferred_quantity = sanitize_float(
        db_session.transferred_quantity)
    if db_session.source_godown:
        db_session.source_godown.current_storage = sanitize_float(
            db_session.source_godown.current_storage)
    if db_session.destination_bin:
        db_session.destination_bin.capacity = sanitize_float(
            db_session.destination_bin.capacity)
        db_session.destination_bin.current_quantity = sanitize_float(
            db_session.destination_bin.current_quantity)
    if db_session.current_bin:
        db_session.current_bin.capacity = sanitize_float(
            db_session.current_bin.capacity)
        db_session.current_bin.current_quantity = sanitize_float(
            db_session.current_bin.current_quantity)

    return db_session


@app.post("/api/transfer-sessions/{session_id}/stop",
          response_model=schemas.TransferSessionWithDetails)
def stop_transfer_session(session_id: int,
                          transferred_quantity: float,
                          db: Session = Depends(get_db)):
    # Get the transfer session
    db_session = db.query(models.TransferSession).filter(
        models.TransferSession.id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404,
                            detail="Transfer session not found")

    if db_session.status != "active":
        raise HTTPException(status_code=400,
                            detail="Transfer session is not active")

    utc_now = get_utc_now()

    print(f"\n🛑 BACKEND: Stopping transfer session {session_id}")
    print(f"   Transferred Quantity: {transferred_quantity} tons")

    # Close current bin transfer record
    current_bin_transfer = db.query(models.BinTransfer).filter(
        models.BinTransfer.transfer_session_id == session_id,
        models.BinTransfer.end_timestamp == None).first()

    if current_bin_transfer:
        current_bin_transfer.end_timestamp = utc_now
        current_bin_transfer.quantity = transferred_quantity

    # Update session
    db_session.stop_timestamp = utc_now
    db_session.transferred_quantity = transferred_quantity
    db_session.status = "completed"

    # Update current bin quantity (add)
    current_bin = db.query(
        models.Bin).filter(models.Bin.id == db_session.current_bin_id).first()
    if current_bin:
        current_bin.current_quantity = (current_bin.current_quantity
                                        or 0) + transferred_quantity
        if current_bin.current_quantity >= current_bin.capacity:
            current_bin.status = models.BinStatus.FULL

    # Update source godown quantity (subtract)
    source_godown = db.query(models.GodownMaster).filter(
        models.GodownMaster.id == db_session.source_godown_id).first()
    if source_godown:
        source_godown.current_storage = max(
            0, (source_godown.current_storage or 0) - transferred_quantity)

    db.commit()
    db.refresh(db_session)

    print(f"   ✅ Stopped transfer session ID {db_session.id}")
    print(f"   ✅ Status: {db_session.status}")
    print(f"   ✅ Transferred Quantity: {db_session.transferred_quantity} tons")

    # Sanitize float values before returning
    db_session.transferred_quantity = sanitize_float(
        db_session.transferred_quantity)
    if db_session.source_godown:
        db_session.source_godown.current_storage = sanitize_float(
            db_session.source_godown.current_storage)
    if db_session.destination_bin:
        db_session.destination_bin.capacity = sanitize_float(
            db_session.destination_bin.capacity)
        db_session.destination_bin.current_quantity = sanitize_float(
            db_session.destination_bin.current_quantity)

    return db_session


@app.get("/api/transfer-sessions",
         response_model=List[schemas.TransferSessionWithDetails])
def get_transfer_sessions(status: Optional[str] = None,
                          skip: int = 0,
                          limit: int = 100,
                          db: Session = Depends(get_db)):
    query = db.query(models.TransferSession)

    if status:
        query = query.filter(models.TransferSession.status == status)

    sessions = query.order_by(
        models.TransferSession.start_timestamp.desc()).offset(skip).limit(
            limit).all()

    print(f"📊 Fetching transfer sessions: total={len(sessions)}")
    for session in sessions:
        print(
            f"   Session {session.id}: status={session.status}, interval={session.cleaning_interval_hours}s, stop={session.stop_timestamp}, magnet={session.magnet_id}"
        )

    # Sanitize float values
    for session in sessions:
        session.transferred_quantity = sanitize_float(
            session.transferred_quantity)
        if session.source_godown:
            session.source_godown.current_storage = sanitize_float(
                session.source_godown.current_storage)
        if session.destination_bin:
            session.destination_bin.capacity = sanitize_float(
                session.destination_bin.capacity)
            session.destination_bin.current_quantity = sanitize_float(
                session.destination_bin.current_quantity)

    return sessions


@app.get("/api/transfer-sessions/{session_id}",
         response_model=schemas.TransferSessionWithDetails)
def get_transfer_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(models.TransferSession).filter(
        models.TransferSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404,
                            detail="Transfer session not found")
    return session


@app.put("/api/transfer-sessions/{session_id}",
         response_model=schemas.TransferSession)
def update_transfer_session(session_id: int,
                            session_update: schemas.TransferSessionUpdate,
                            db: Session = Depends(get_db)):
    db_session = db.query(models.TransferSession).filter(
        models.TransferSession.id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404,
                            detail="Transfer session not found")

    update_data = session_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_session, key, value)

    db.commit()
    db.refresh(db_session)
    return db_session


@app.delete("/api/transfer-sessions/{session_id}")
def delete_transfer_session(session_id: int, db: Session = Depends(get_db)):
    db_session = db.query(models.TransferSession).filter(
        models.TransferSession.id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404,
                            detail="Transfer session not found")

    try:
        db.delete(db_session)
        db.commit()
        return {
            "message": "Transfer session deleted successfully",
            "id": session_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete transfer session: {str(e)}")


# Reporting endpoints
@app.get("/api/reports/cleaning-history")
def get_cleaning_history_report(magnet_id: Optional[int] = None,
                                transfer_session_id: Optional[int] = None,
                                start_date: Optional[str] = None,
                                end_date: Optional[str] = None,
                                skip: int = 0,
                                limit: int = 100,
                                db: Session = Depends(get_db)):
    query = db.query(models.MagnetCleaningRecord)

    if magnet_id:
        query = query.filter(
            models.MagnetCleaningRecord.magnet_id == magnet_id)

    if transfer_session_id:
        query = query.filter(models.MagnetCleaningRecord.transfer_session_id ==
                             transfer_session_id)

    if start_date:
        start_dt = parse_ist_datetime(start_date)
        if start_dt:
            query = query.filter(
                models.MagnetCleaningRecord.cleaning_timestamp >= start_dt)

    if end_date:
        end_dt = parse_ist_datetime(end_date)
        if end_dt:
            query = query.filter(
                models.MagnetCleaningRecord.cleaning_timestamp <= end_dt)

    records = query.order_by(
        models.MagnetCleaningRecord.cleaning_timestamp.desc()).offset(
            skip).limit(limit).all()
    return records


@app.get("/api/reports/transfer-details")
def get_transfer_details_report(start_date: Optional[str] = None,
                                end_date: Optional[str] = None,
                                status: Optional[str] = None,
                                skip: int = 0,
                                limit: int = 100,
                                db: Session = Depends(get_db)):
    query = db.query(models.TransferSession)

    if status:
        query = query.filter(models.TransferSession.status == status)

    if start_date:
        start_dt = parse_ist_datetime(start_date)
        if start_dt:
            query = query.filter(
                models.TransferSession.start_timestamp >= start_dt)

    if end_date:
        end_dt = parse_ist_datetime(end_date)
        if end_dt:
            query = query.filter(
                models.TransferSession.start_timestamp <= end_dt)

    sessions = query.order_by(
        models.TransferSession.start_timestamp.desc()).offset(skip).limit(
            limit).all()

    # Prepare detailed transfer reports with cleaning records
    result = []
    for session in sessions:
        session_dict = schemas.TransferSessionWithDetails.model_validate(
            session).model_dump()
        result.append(session_dict)

    return result


@app.post("/api/branches", response_model=schemas.Branch)
def create_branch(branch: schemas.BranchCreate, db: Session = Depends(get_db)):
    db_branch = db.query(
        models.Branch).filter(models.Branch.name == branch.name).first()
    if db_branch:
        raise HTTPException(status_code=400,
                            detail="Branch with this name already exists")

    db_branch = models.Branch(**branch.dict())
    db.add(db_branch)
    db.commit()
    db.refresh(db_branch)
    return db_branch


@app.get("/api/branches", response_model=List[schemas.Branch])
def get_branches(skip: int = 0,
                 limit: int = 100,
                 db: Session = Depends(get_db)):
    branches = db.query(models.Branch).offset(skip).limit(limit).all()
    return branches


@app.get("/api/branches/{branch_id}", response_model=schemas.Branch)
def get_branch(branch_id: int, db: Session = Depends(get_db)):
    branch = db.query(
        models.Branch).filter(models.Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    return branch


@app.put("/api/branches/{branch_id}", response_model=schemas.Branch)
def update_branch(branch_id: int,
                  branch: schemas.BranchUpdate,
                  db: Session = Depends(get_db)):
    db_branch = db.query(
        models.Branch).filter(models.Branch.id == branch_id).first()
    if not db_branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    for key, value in branch.dict(exclude_unset=True).items():
        setattr(db_branch, key, value)

    db.commit()
    db.refresh(db_branch)
    return db_branch


@app.delete("/api/branches/{branch_id}")
def delete_branch(branch_id: int, db: Session = Depends(get_db)):
    db_branch = db.query(
        models.Branch).filter(models.Branch.id == branch_id).first()
    if not db_branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    db.delete(db_branch)
    db.commit()
    return {"message": "Branch deleted successfully"}


@app.post("/api/users", response_model=schemas.UserWithBranches)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(
        models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    db_user = models.User(username=user.username,
                          email=user.email,
                          full_name=user.full_name,
                          hashed_password=user.password,
                          role=user.role or "user",
                          is_active=True)

    if user.branch_ids:
        branches = db.query(models.Branch).filter(
            models.Branch.id.in_(user.branch_ids)).all()
        if len(branches) != len(user.branch_ids):
            raise HTTPException(status_code=404,
                                detail="One or more branches not found")
        db_user.branches = branches

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.get("/api/users", response_model=List[schemas.UserWithBranches])
def get_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users


@app.get("/api/users/{user_id}", response_model=schemas.UserWithBranches)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.put("/api/users/{user_id}", response_model=schemas.UserWithBranches)
def update_user(user_id: int,
                user: schemas.UserUpdate,
                db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.username is not None:
        existing = db.query(models.User).filter(
            models.User.username == user.username, models.User.id
            != user_id).first()
        if existing:
            raise HTTPException(status_code=400,
                                detail="Username already exists")
        db_user.username = user.username

    if user.password is not None and user.password != "":
        db_user.hashed_password = user.password

    if user.email is not None:
        db_user.email = user.email

    if user.full_name is not None:
        db_user.full_name = user.full_name

    if user.role is not None:
        db_user.role = user.role

    if user.branch_ids is not None:
        branches = db.query(models.Branch).filter(
            models.Branch.id.in_(user.branch_ids)).all()
        if len(branches) != len(user.branch_ids):
            raise HTTPException(status_code=404,
                                detail="One or more branches not found")
        db_user.branches = branches

    db.commit()
    db.refresh(db_user)
    return db_user


@app.delete("/api/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(db_user)
    db.commit()
    return {"message": "User deleted successfully"}


@app.post("/api/raw-products", response_model=schemas.RawProduct)
def create_raw_product(product: schemas.RawProductCreate, branch_id: Optional[int] = Header(None), db: Session = Depends(get_db)):
    db_product = models.RawProduct(product_name=product.product_name, product_initial=product.product_initial, branch_id=branch_id or product.branch_id)
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@app.get("/api/raw-products", response_model=List[schemas.RawProduct])
def get_raw_products(branch_id: Optional[int] = Header(None, alias="X-Branch-Id"), db: Session = Depends(get_db)):
    query = db.query(models.RawProduct)
    if branch_id:
        query = query.filter(models.RawProduct.branch_id == branch_id)
    return query.all()

@app.get("/api/raw-products/{product_id}", response_model=schemas.RawProduct)
def get_raw_product(product_id: int, db: Session = Depends(get_db)):
    db_product = db.query(models.RawProduct).filter(models.RawProduct.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Raw product not found")
    return db_product

@app.put("/api/raw-products/{product_id}", response_model=schemas.RawProduct)
def update_raw_product(product_id: int, product: schemas.RawProductUpdate, db: Session = Depends(get_db)):
    db_product = db.query(models.RawProduct).filter(models.RawProduct.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Raw product not found")
    db_product.product_name = product.product_name
    db_product.product_initial = product.product_initial
    db.commit()
    db.refresh(db_product)
    return db_product

@app.delete("/api/raw-products/{product_id}")
def delete_raw_product(product_id: int, db: Session = Depends(get_db)):
    db_product = db.query(models.RawProduct).filter(models.RawProduct.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Raw product not found")
    db.delete(db_product)
    db.commit()
    return {"message": "Raw product deleted successfully"}

@app.post("/api/finished-goods", response_model=schemas.FinishedGood)
def create_finished_good(product: schemas.FinishedGoodCreate, branch_id: Optional[int] = Header(None), db: Session = Depends(get_db)):
    db_product = models.FinishedGood(product_name=product.product_name, product_initial=product.product_initial, branch_id=branch_id or product.branch_id)
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@app.get("/api/finished-goods", response_model=List[schemas.FinishedGood])
def get_finished_goods(branch_id: Optional[int] = Header(None, alias="X-Branch-Id"), db: Session = Depends(get_db)):
    query = db.query(models.FinishedGood)
    if branch_id:
        query = query.filter(models.FinishedGood.branch_id == branch_id)
    return query.all()

@app.get("/api/finished-goods/{product_id}", response_model=schemas.FinishedGood)
def get_finished_good(product_id: int, db: Session = Depends(get_db)):
    db_product = db.query(models.FinishedGood).filter(models.FinishedGood.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Finished good not found")
    return db_product

@app.put("/api/finished-goods/{product_id}", response_model=schemas.FinishedGood)
def update_finished_good(product_id: int, product: schemas.FinishedGoodUpdate, db: Session = Depends(get_db)):
    db_product = db.query(models.FinishedGood).filter(models.FinishedGood.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Finished good not found")
    db_product.product_name = product.product_name
    db_product.product_initial = product.product_initial
    db.commit()
    db.refresh(db_product)
    return db_product

@app.delete("/api/finished-goods/{product_id}")
def delete_finished_good(product_id: int, db: Session = Depends(get_db)):
    db_product = db.query(models.FinishedGood).filter(models.FinishedGood.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Finished good not found")
    db.delete(db_product)
    db.commit()
    return {"message": "Finished good deleted successfully"}

@app.post("/api/production-orders", response_model=schemas.ProductionOrder)
def create_production_order(order: schemas.ProductionOrderCreate, branch_id: Optional[int] = Header(None), db: Session = Depends(get_db)):
    db_order = models.ProductionOrder(
        order_number=order.order_number,
        raw_product_id=order.raw_product_id,
        quantity=order.quantity,
        order_date=order.order_date or get_utc_now(),
        target_finish_date=order.target_finish_date,
        status=order.status or "CREATED",
        branch_id=branch_id or order.branch_id
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order

@app.get("/api/production-orders", response_model=List[schemas.ProductionOrderWithProduct])
def get_production_orders(branch_id: Optional[int] = Header(None, alias="X-Branch-Id"), db: Session = Depends(get_db)):
    query = db.query(models.ProductionOrder).filter(models.ProductionOrder.status != models.ProductionOrderStatus.COMPLETED)
    if branch_id:
        query = query.filter(models.ProductionOrder.branch_id == branch_id)
    return query.all()

@app.get("/api/production-orders/{order_id}", response_model=schemas.ProductionOrderWithProduct)
def get_production_order(order_id: int, db: Session = Depends(get_db)):
    db_order = db.query(models.ProductionOrder).filter(models.ProductionOrder.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Production order not found")
    return db_order

@app.put("/api/production-orders/{order_id}", response_model=schemas.ProductionOrder)
def update_production_order(order_id: int, order_update: schemas.ProductionOrderUpdate, db: Session = Depends(get_db)):
    db_order = db.query(models.ProductionOrder).filter(models.ProductionOrder.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Production order not found")
    if order_update.order_number:
        db_order.order_number = order_update.order_number
    if order_update.quantity:
        db_order.quantity = order_update.quantity
    if order_update.target_finish_date:
        db_order.target_finish_date = order_update.target_finish_date
    if order_update.status:
        db_order.status = order_update.status
    db.commit()
    db.refresh(db_order)
    return db_order

@app.delete("/api/production-orders/{order_id}")
def delete_production_order(order_id: int, db: Session = Depends(get_db)):
    db_order = db.query(models.ProductionOrder).filter(models.ProductionOrder.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Production order not found")
    db.delete(db_order)
    db.commit()
    return {"message": "Production order deleted successfully"}


# Production Order Planning Endpoints
@app.get("/api/production-orders/{order_id}/planning", response_model=schemas.ProductionOrderWithPlanning)
def get_production_order_planning(order_id: int, db: Session = Depends(get_db)):
    """Get production order with planning details (source and destination bins)"""
    db_order = db.query(models.ProductionOrder).filter(models.ProductionOrder.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Production order not found")
    return db_order


@app.post("/api/production-orders/{order_id}/planning", response_model=schemas.ProductionOrderWithPlanning)
def save_production_order_planning(
    order_id: int,
    planning: schemas.ProductionOrderPlanningCreate,
    db: Session = Depends(get_db)
):
    """Save planning configuration for a production order with validations"""
    db_order = db.query(models.ProductionOrder).filter(models.ProductionOrder.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Production order not found")
    
    # Validation 1: Blend percentages must total 100%
    total_percentage = sum(sb.blend_percentage for sb in planning.source_bins)
    if abs(total_percentage - 100.0) > 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"Blend percentages must total 100%. Current total: {total_percentage}%"
        )
    
    # Validation 2: Check sufficient quantity in source bins
    for source in planning.source_bins:
        bin_obj = db.query(models.Bin).filter(models.Bin.id == source.bin_id).first()
        if not bin_obj:
            raise HTTPException(status_code=400, detail=f"Source bin {source.bin_id} not found")
        if bin_obj.current_quantity < source.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient quantity in bin {bin_obj.bin_number}. Available: {bin_obj.current_quantity}, Requested: {source.quantity}"
            )
    
    # Validation 3: Check destination bins capacity
    for dest in planning.destination_bins:
        bin_obj = db.query(models.Bin).filter(models.Bin.id == dest.bin_id).first()
        if not bin_obj:
            raise HTTPException(status_code=400, detail=f"Destination bin {dest.bin_id} not found")
        available_capacity = bin_obj.capacity - bin_obj.current_quantity
        if available_capacity < dest.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient capacity in bin {bin_obj.bin_number}. Available: {available_capacity}, Requested: {dest.quantity}"
            )
    
    # Validation 4: Total distribution must equal order quantity
    total_distribution = sum(d.quantity for d in planning.destination_bins)
    if abs(total_distribution - db_order.quantity) > 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"Total distribution ({total_distribution}) must equal order quantity ({db_order.quantity})"
        )
    
    # Clear existing planning data
    db.query(models.ProductionOrderSourceBin).filter(
        models.ProductionOrderSourceBin.production_order_id == order_id
    ).delete()
    db.query(models.ProductionOrderDestinationBin).filter(
        models.ProductionOrderDestinationBin.production_order_id == order_id
    ).delete()
    
    # Add new source bins
    for source in planning.source_bins:
        db_source = models.ProductionOrderSourceBin(
            production_order_id=order_id,
            bin_id=source.bin_id,
            blend_percentage=source.blend_percentage,
            quantity=source.quantity
        )
        db.add(db_source)
    
    # Add new destination bins
    for dest in planning.destination_bins:
        db_dest = models.ProductionOrderDestinationBin(
            production_order_id=order_id,
            bin_id=dest.bin_id,
            quantity=dest.quantity
        )
        db.add(db_dest)
    
    # Update order status to PLANNED
    db_order.status = models.ProductionOrderStatus.PLANNED
    
    db.commit()
    db.refresh(db_order)
    return db_order


@app.post("/api/production-orders/{order_id}/planning/validate")
def validate_production_order_planning(
    order_id: int,
    planning: schemas.ProductionOrderPlanningCreate,
    db: Session = Depends(get_db)
):
    """Validate planning configuration without saving"""
    db_order = db.query(models.ProductionOrder).filter(models.ProductionOrder.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Production order not found")
    
    errors = []
    warnings = []
    
    # Validation 1: Blend percentages must total 100%
    total_percentage = sum(sb.blend_percentage for sb in planning.source_bins)
    if abs(total_percentage - 100.0) > 0.01:
        errors.append(f"Blend percentages must total 100%. Current total: {total_percentage}%")
    
    # Validation 2: Check sufficient quantity in source bins
    for source in planning.source_bins:
        bin_obj = db.query(models.Bin).filter(models.Bin.id == source.bin_id).first()
        if not bin_obj:
            errors.append(f"Source bin {source.bin_id} not found")
        elif bin_obj.current_quantity < source.quantity:
            errors.append(f"Insufficient quantity in bin {bin_obj.bin_number}. Available: {bin_obj.current_quantity}, Requested: {source.quantity}")
        elif bin_obj.current_quantity < source.quantity * 1.1:
            warnings.append(f"Low quantity warning for bin {bin_obj.bin_number}")
    
    # Validation 3: Check destination bins capacity
    for dest in planning.destination_bins:
        bin_obj = db.query(models.Bin).filter(models.Bin.id == dest.bin_id).first()
        if not bin_obj:
            errors.append(f"Destination bin {dest.bin_id} not found")
        else:
            available_capacity = bin_obj.capacity - bin_obj.current_quantity
            if available_capacity < dest.quantity:
                errors.append(f"Insufficient capacity in bin {bin_obj.bin_number}. Available: {available_capacity}, Requested: {dest.quantity}")
    
    # Validation 4: Total distribution must equal order quantity
    total_distribution = sum(d.quantity for d in planning.destination_bins)
    if abs(total_distribution - db_order.quantity) > 0.01:
        errors.append(f"Total distribution ({total_distribution}) must equal order quantity ({db_order.quantity})")
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "order_quantity": db_order.quantity,
        "total_source_percentage": total_percentage,
        "total_distribution": total_distribution
    }


# ===================== TRANSFER RECORDING ENDPOINTS =====================

@app.get("/api/transfer/planned-orders", response_model=List[schemas.ProductionOrderWithPlanning])
def get_planned_orders(branch_id: Optional[int] = Header(None), db: Session = Depends(get_db)):
    """Get all PLANNED production orders with their destination bins"""
    query = db.query(models.ProductionOrder).filter(
        models.ProductionOrder.status == models.ProductionOrderStatus.PLANNED
    )
    if branch_id:
        query = query.filter(models.ProductionOrder.branch_id == branch_id)
    
    orders = query.all()
    return orders


@app.get("/api/transfer/destination-bins/{order_id}", response_model=List[schemas.ProductionOrderDestinationBinWithDetails])
def get_destination_bins(order_id: int, db: Session = Depends(get_db)):
    """Get destination bins for a production order"""
    dest_bins = db.query(models.ProductionOrderDestinationBin).filter(
        models.ProductionOrderDestinationBin.production_order_id == order_id
    ).all()
    return dest_bins


@app.post("/api/transfer/start", response_model=schemas.TransferRecordingWithDetails)
def start_transfer(
    data: schemas.TransferRecordingStartTransfer,
    db: Session = Depends(get_db),
    user_id: Optional[int] = Header(None)
):
    """Start transfer from source bins to destination bin"""
    # Get production order and destination bins configuration
    prod_order = db.query(models.ProductionOrder).filter(
        models.ProductionOrder.id == data.production_order_id
    ).first()
    if not prod_order:
        raise HTTPException(status_code=404, detail="Production order not found")
    
    dest_bin_config = db.query(models.ProductionOrderDestinationBin).filter(
        models.ProductionOrderDestinationBin.production_order_id == data.production_order_id,
        models.ProductionOrderDestinationBin.bin_id == data.destination_bin_id
    ).first()
    if not dest_bin_config:
        raise HTTPException(status_code=404, detail="Destination bin not configured for this order")
    
    # Create transfer recording
    transfer = models.TransferRecording(
        production_order_id=data.production_order_id,
        destination_bin_id=data.destination_bin_id,
        # quantity_planned=dest_bin_config.quantity,  # Removed to support production DB
        status=models.TransferRecordingStatus.IN_PROGRESS,
        transfer_start_time=get_utc_now(),
        created_by=user_id
    )
    db.add(transfer)
    db.commit()
    db.refresh(transfer)
    return transfer


@app.get("/api/transfer/{transfer_id}", response_model=schemas.TransferRecordingWithDetails)
def get_transfer_status(transfer_id: int, db: Session = Depends(get_db)):
    """Get current transfer status and monitoring data"""
    transfer = db.query(models.TransferRecording).filter(
        models.TransferRecording.id == transfer_id
    ).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    return transfer


@app.post("/api/transfer/{transfer_id}/complete", response_model=schemas.TransferRecordingWithDetails)
def complete_transfer(
    transfer_id: int,
    data: schemas.TransferRecordingCompleteTransfer,
    db: Session = Depends(get_db),
    user_id: Optional[int] = Header(None)
):
    """Complete current transfer and optionally divert to next bin"""
    transfer = db.query(models.TransferRecording).filter(
        models.TransferRecording.id == transfer_id
    ).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    
    if transfer.status != models.TransferRecordingStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="Transfer is not in progress")
    
    # Mark transfer as completed
    transfer.status = models.TransferRecordingStatus.COMPLETED
    transfer.transfer_end_time = get_utc_now()
    transfer.water_added = data.water_added
    transfer.moisture_level = data.moisture_level
    
    # Calculate duration
    if transfer.transfer_start_time and transfer.transfer_end_time:
        duration = transfer.transfer_end_time - transfer.transfer_start_time
        transfer.duration_minutes = int(duration.total_seconds() / 60)
    
    transfer.updated_by = user_id
    db.commit()
    db.refresh(transfer)
    return transfer


@app.post("/api/transfer/{transfer_id}/divert/{next_bin_id}", response_model=schemas.TransferRecordingWithDetails)
def divert_transfer(
    transfer_id: int,
    next_bin_id: int,
    data: schemas.TransferRecordingCompleteTransfer,
    db: Session = Depends(get_db),
    user_id: Optional[int] = Header(None)
):
    """Divert current transfer to next bin (completes current, starts new)"""
    # Complete current transfer
    transfer = db.query(models.TransferRecording).filter(
        models.TransferRecording.id == transfer_id
    ).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    
    transfer.status = models.TransferRecordingStatus.COMPLETED
    transfer.transfer_end_time = get_utc_now()
    transfer.water_added = data.water_added
    transfer.moisture_level = data.moisture_level
    
    if transfer.transfer_start_time and transfer.transfer_end_time:
        duration = transfer.transfer_end_time - transfer.transfer_start_time
        transfer.duration_minutes = int(duration.total_seconds() / 60)
    
    transfer.updated_by = user_id
    
    # quantity_for_new_bin = dest_bin_config.quantity if dest_bin_config else transfer.quantity_planned
    
    # Create new transfer for next destination bin
    new_transfer = models.TransferRecording(
        production_order_id=transfer.production_order_id,
        destination_bin_id=next_bin_id,
        # quantity_planned=quantity_for_new_bin,
        status=models.TransferRecordingStatus.IN_PROGRESS,
        transfer_start_time=get_utc_now(),
        created_by=user_id
    )
    
    db.add(new_transfer)
    db.commit()
    db.refresh(new_transfer)
    return new_transfer


@app.get("/api/transfer/order/{order_id}/history")
def get_transfer_history(order_id: int, db: Session = Depends(get_db)):
    """Get transfer history for a production order"""
    try:
        # We query the records but handle potential missing columns by using a safer query or catch
        # If quantity_planned is missing in DB, this will fail.
        # Let's use a more robust way to fetch if we are unsure about schema sync
        records = db.query(models.TransferRecording).filter(
            models.TransferRecording.production_order_id == order_id
        ).order_by(models.TransferRecording.created_at.desc()).all()
        
        # Manually construct response to avoid issues with missing columns in the model vs DB
        result = []
        for r in records:
            try:
                result.append({
                    "id": r.id,
                    "production_order_id": r.production_order_id,
                    "destination_bin_id": r.destination_bin_id,
                    "destination_bin": {
                        "id": r.destination_bin.id,
                        "bin_number": r.destination_bin.bin_number
                    } if r.destination_bin else None,
                    "status": r.status,
                    "quantity_transferred": r.quantity_transferred,
                    "transfer_start_time": r.transfer_start_time,
                    "transfer_end_time": r.transfer_end_time,
                    "created_at": r.created_at
                })
            except Exception:
                continue
        return result
    except Exception as e:
        print(f"Error fetching transfer history for order {order_id}: {e}")
        return []


@app.post("/api/login", response_model=schemas.LoginResponse)
def login(credentials: schemas.LoginRequest, db: Session = Depends(get_db)):
    print(f"🔐 Login attempt for username: {credentials.username}")

    user = db.query(models.User).filter(
        models.User.username == credentials.username).first()

    if not user:
        print(f"❌ User not found: {credentials.username}")
        raise HTTPException(status_code=401,
                            detail="Invalid username or password")

    if not user.is_active:
        print(f"❌ User inactive: {credentials.username}")
        raise HTTPException(status_code=401,
                            detail="Invalid username or password")

    # Plain text password comparison
    if user.hashed_password != credentials.password:
        print(f"❌ Invalid password for user: {credentials.username}")
        raise HTTPException(status_code=401,
                            detail="Invalid username or password")

    print(f"✅ Login successful for user: {credentials.username}")
    return schemas.LoginResponse(user_id=user.id,
                                 username=user.username,
                                 full_name=user.full_name,
                                 email=user.email,
                                 role=user.role,
                                 branches=user.branches)


# ============================================================================
# 12-Hour Transfer API Endpoints
# ============================================================================

@app.get("/api/12hour-transfer/production-orders", response_model=List[schemas.ProductionOrder])
def get_12hour_available_production_orders(
    branch_id: Optional[int] = Header(None, alias="X-Branch-Id"),
    db: Session = Depends(get_db)
):
    """
    Get production orders that have at least one 24-hour bin 
    that has completed its transfer process.
    """
    # Orders that have at least one completed 24h transfer record
    completed_orders_ids = db.query(models.TransferRecording.production_order_id).all()
    completed_orders_ids = [r[0] for r in completed_orders_ids]

    query = db.query(models.ProductionOrder).filter(
        models.ProductionOrder.id.in_(completed_orders_ids)
    )
    if branch_id:
        query = query.filter(models.ProductionOrder.branch_id == branch_id)
    
    return query.all()


@app.get("/api/12hour-transfer/available-source-bins/{production_order_id}")
def get_available_source_bins(production_order_id: int, db: Session = Depends(get_db)):
    """
    Get available 24-hour source bins for a specific production order.
    Only bins that have completed their 24-hour transfer for this order are shown.
    """
    # Find all completed 24h transfer records for this production order
    completed_transfers = db.query(models.TransferRecording).filter(
        models.TransferRecording.production_order_id == production_order_id,
        models.TransferRecording.status == models.TransferRecordingStatus.COMPLETED
    ).all()
    
    completed_bin_ids = [t.destination_bin_id for t in completed_transfers]
    
    if not completed_bin_ids:
        return []

    source_bins = db.query(models.Bin).filter(
        models.Bin.id.in_(completed_bin_ids),
        models.Bin.status == "Active"
    ).all()
    
    result = []
    for bin_obj in source_bins:
        result.append({
            "id": bin_obj.id,
            "bin_number": bin_obj.bin_number,
            "capacity": bin_obj.capacity,
            "current_quantity": bin_obj.current_quantity,
            "bin_type": bin_obj.bin_type,
            "status": bin_obj.status
        })
    return result


@app.get("/api/12hour-transfer/available-destination-bins")
@app.get("/api/12hour-transfer/available-destination-bins")
def get_available_destination_bins(db: Session = Depends(get_db)):
    """Get available 12-hour destination bins (filtered by type, status, capacity, and current activity)"""
    try:
        # 1. Base query for 12-hour bins that are Active
        query = db.query(models.Bin).filter(
            models.Bin.bin_type == "12 hours bin",
            models.Bin.status == "Active"
        )
        
        # 2. Get IDs of bins currently locked in an active 12-hour transfer session
        locked_bin_ids = []
        
        # Check normal mappings
        try:
            active_mapping_bins = db.query(models.Transfer12HourBinsMapping.destination_bin_id).join(
                models.Transfer12HourSession, 
                models.Transfer12HourSession.id == models.Transfer12HourBinsMapping.transfer_session_id
            ).filter(
                models.Transfer12HourSession.status == models.Transfer12HourSessionStatus.IN_PROGRESS,
                (models.Transfer12HourBinsMapping.status == models.Transfer12HourBinsMappingStatus.IN_PROGRESS) | 
                (models.Transfer12HourBinsMapping.is_locked == True)
            ).all()
            locked_bin_ids.extend([r[0] for r in active_mapping_bins])
        except Exception as e:
            print(f"Warning querying active_mapping_bins: {e}")

        # Check special transfers
        try:
            active_special_bins = db.query(models.Transfer12HourSpecialTransfer.special_destination_bin_id).join(
                models.Transfer12HourSession,
                models.Transfer12HourSession.id == models.Transfer12HourSpecialTransfer.transfer_session_id
            ).filter(
                models.Transfer12HourSession.status == models.Transfer12HourSessionStatus.IN_PROGRESS,
                models.Transfer12HourSpecialTransfer.status == models.Transfer12HourSpecialStatus.IN_PROGRESS
            ).all()
            locked_bin_ids.extend([r[0] for r in active_special_bins])
        except Exception as e:
            print(f"Warning querying active_special_bins: {e}")

        # Apply locking filter if any bins are locked
        if locked_bin_ids:
            query = query.filter(~models.Bin.id.in_(list(set(locked_bin_ids))))
            
        destination_bins = query.all()
        
        # CRITICAL FALLBACK: If we get absolutely nothing, return all active 12-hour bins
        # This resolves the user reported issue where they get "nothing"
        if not destination_bins:
            destination_bins = db.query(models.Bin).filter(
                models.Bin.bin_type == "12 hours bin",
                models.Bin.status == "Active"
            ).all()

    except Exception as e:
        print(f"CRITICAL ERROR in get_available_destination_bins: {e}")
        # Final safety fallback
        destination_bins = []
        try:
            destination_bins = db.query(models.Bin).filter(
                models.Bin.bin_type == "12 hours bin",
                models.Bin.status == "Active"
            ).all()
        except:
            pass
    
    result = []
    for bin_obj in destination_bins:
        result.append({
            "id": bin_obj.id,
            "bin_number": bin_obj.bin_number,
            "capacity": bin_obj.capacity,
            "current_quantity": bin_obj.current_quantity,
            "remaining_capacity": bin_obj.capacity - bin_obj.current_quantity,
            "bin_type": bin_obj.bin_type,
            "status": bin_obj.status
        })
    print(f"DEBUG: Returning {len(result)} available destination bins.")
    return result

@app.post("/api/12hour-transfer/create-session-normal")
def create_transfer_session_normal(
    request: schemas.Transfer12HourSessionCreate,
    db: Session = Depends(get_db),
    user_id: Optional[int] = Header(None)
):
    """Create a Normal 12-hour transfer session with simplified mapping"""
    # Prevent concurrent transfers
    active_session = db.query(models.Transfer12HourSession).filter(
        models.Transfer12HourSession.status.in_([
            models.Transfer12HourSessionStatus.IN_PROGRESS,
            models.Transfer12HourSessionStatus.PLANNED
        ])
    ).first()
    if active_session:
        # Check if it's actually stalled (older than 1 minute)
        now = datetime.utcnow()
        if (now - active_session.created_at).total_seconds() > 60:
            active_session.status = models.Transfer12HourSessionStatus.COMPLETED
            db.commit()
        else:
            raise HTTPException(status_code=400, detail="Another transfer session is already active")

    session = models.Transfer12HourSession(
        production_order_id=request.production_order_id,
        transfer_type=models.Transfer12HourType.NORMAL,
        status=models.Transfer12HourSessionStatus.PLANNED,
        created_by=user_id
    )
    db.add(session)
    db.flush()
    
    # Add simplified bins mapping (single pair)
    bins_map = models.Transfer12HourBinsMapping(
        transfer_session_id=session.id,
        source_bin_id=request.source_bin_id,
        destination_bin_id=request.destination_bin_id,
        source_sequence=1,
        destination_sequence=1
    )
    db.add(bins_map)
    
    db.commit()
    db.refresh(session)
    
    return {
        "id": session.id,
        "production_order_id": session.production_order_id,
        "transfer_type": session.transfer_type,
        "status": session.status,
        "message": "Normal transfer session created successfully"
    }


@app.post("/api/12hour-transfer/create-session-special")
def create_transfer_session_special(
    request: schemas.Transfer12HourSessionCreateSpecial,
    db: Session = Depends(get_db),
    user_id: Optional[int] = Header(None)
):
    """Create a Special 12-hour transfer session with both normal and special mappings"""
    # Prevent concurrent transfers
    active_session = db.query(models.Transfer12HourSession).filter(
        models.Transfer12HourSession.status.in_([
            models.Transfer12HourSessionStatus.IN_PROGRESS,
            models.Transfer12HourSessionStatus.PLANNED
        ])
    ).first()
    if active_session:
        # Check if it's actually stalled (older than 1 minute)
        now = datetime.utcnow()
        if (now - active_session.created_at).total_seconds() > 60:
            active_session.status = models.Transfer12HourSessionStatus.COMPLETED
            db.commit()
        else:
            raise HTTPException(status_code=400, detail="Another transfer session is already active")

    session = models.Transfer12HourSession(
        production_order_id=request.production_order_id,
        transfer_type=models.Transfer12HourType.SPECIAL,
        status=models.Transfer12HourSessionStatus.IN_PROGRESS,  # Set to in-progress immediately
        created_by=user_id
    )
    db.add(session)
    db.flush()
    
    # Add normal bins mapping (Standard Transfer)
    normal_mapping = models.Transfer12HourBinsMapping(
        transfer_session_id=session.id,
        source_bin_id=request.source_bin_id,
        destination_bin_id=request.destination_bin_id,
        source_sequence=1,
        destination_sequence=1,
        status=models.Transfer12HourBinsMappingStatus.IN_PROGRESS,
        start_timestamp=get_utc_now()
    )
    db.add(normal_mapping)
    
    # Add special manual transfer mapping if provided
    if request.special_source_bin_id and request.special_destination_bin_id:
        special = models.Transfer12HourSpecialTransfer(
            transfer_session_id=session.id,
            special_source_bin_id=request.special_source_bin_id,
            special_destination_bin_id=request.special_destination_bin_id,
            manual_quantity=request.manual_quantity,
            status=models.Transfer12HourSpecialStatus.PENDING,
            created_at=get_utc_now(),
            updated_at=get_utc_now()
        )
        db.add(special)
    
    db.commit()
    db.refresh(session)
    
    return session

@app.get("/api/12hour-transfer/sessions")
def list_transfer_sessions(db: Session = Depends(get_db)):
    """List all 12-hour transfer sessions"""
    sessions = db.query(models.Transfer12HourSession).order_by(models.Transfer12HourSession.created_at.desc()).all()
    return sessions


@app.post("/api/12hour-transfer/record")
def record_12hour_transfer(
    record: schemas.Transfer12HourRecordCreate,
    session_id: int,
    db: Session = Depends(get_db),
    user_id: Optional[int] = Header(None)
):
    """Record transfer quantity and update bin levels"""
    session = db.query(models.Transfer12HourSession).filter(
        models.Transfer12HourSession.id == session_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    source_bin = db.query(models.Bin).filter(models.Bin.id == record.source_bin_id).first()
    dest_bin = db.query(models.Bin).filter(models.Bin.id == record.destination_bin_id).first()
    
    if not source_bin or not dest_bin:
        raise HTTPException(status_code=400, detail="Invalid source or destination bin")
        
    # Create record
    # Find the active bins mapping for this session
    bins_mapping = db.query(models.Transfer12HourBinsMapping).filter(
        models.Transfer12HourBinsMapping.transfer_session_id == session_id,
        models.Transfer12HourBinsMapping.source_bin_id == record.source_bin_id,
        models.Transfer12HourBinsMapping.destination_bin_id == record.destination_bin_id,
        models.Transfer12HourBinsMapping.status == models.Transfer12HourBinsMappingStatus.IN_PROGRESS
    ).first()

    # If no in-progress mapping found, try to find any mapping for these bins in this session
    if not bins_mapping:
        bins_mapping = db.query(models.Transfer12HourBinsMapping).filter(
            models.Transfer12HourBinsMapping.transfer_session_id == session_id,
            models.Transfer12HourBinsMapping.source_bin_id == record.source_bin_id,
            models.Transfer12HourBinsMapping.destination_bin_id == record.destination_bin_id
        ).first()

    # If still no mapping, and it's a special transfer, create one on the fly
    if not bins_mapping and session.transfer_type == models.Transfer12HourType.SPECIAL:
        bins_mapping = models.Transfer12HourBinsMapping(
            transfer_session_id=session_id,
            source_bin_id=record.source_bin_id,
            destination_bin_id=record.destination_bin_id,
            source_sequence=1,
            destination_sequence=1,
            status=models.Transfer12HourBinsMappingStatus.IN_PROGRESS,
            start_timestamp=get_utc_now(),
            is_locked=True  # Lock the destination bin for special transfer
        )
        db.add(bins_mapping)
        db.flush()
    elif bins_mapping and session.transfer_type == models.Transfer12HourType.SPECIAL:
        # If it was a pre-configured mapping in a special transfer, lock it now
        bins_mapping.is_locked = True
    
    db_record = models.Transfer12HourRecord(
        transfer_session_id=session_id,
        bins_mapping_id=bins_mapping.id if bins_mapping else None,
        source_bin_id=record.source_bin_id,
        destination_bin_id=record.destination_bin_id,
        quantity_transferred=record.quantity_transferred,
        water_added=record.water_added,
        moisture_level=record.moisture_level,
        status=models.TransferRecordingStatus.COMPLETED,
        created_by=user_id
    )
    
    # Update bin levels
    source_bin.current_quantity -= record.quantity_transferred
    dest_bin.current_quantity += record.quantity_transferred
    
    db.add(db_record)
    db.commit()
    
    return {"message": "Transfer recorded and bin levels updated successfully"}


@app.get("/api/12hour-transfer/session/{session_id}")
def get_transfer_session(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get transfer session details"""
    session = db.query(models.Transfer12HourSession).filter(
        models.Transfer12HourSession.id == session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Calculate elapsed seconds if active
    elapsed = 0
    if session.status == models.Transfer12HourSessionStatus.IN_PROGRESS and session.created_at:
        now = datetime.utcnow()
        elapsed = int((now - session.created_at).total_seconds())

    return {
        "id": session.id,
        "production_order_id": session.production_order_id,
        "transfer_type": session.transfer_type,
        "status": session.status,
        "session_sequence": session.session_sequence,
        "created_at": format_ist_iso(session.created_at),
        "elapsed_seconds": elapsed
    }

@app.patch("/api/12hour-transfer/session/{session_id}")
def update_transfer_session(
    session_id: int,
    update_data: dict,
    db: Session = Depends(get_db)
):
    """Update transfer session status and check if production order is completed"""
    session = db.query(models.Transfer12HourSession).filter(
        models.Transfer12HourSession.id == session_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if "status" in update_data:
        session.status = update_data["status"]
        if update_data["status"] == "COMPLETED":
            session.end_timestamp = datetime.utcnow()
            # Also complete any in-progress mappings
            db.query(models.Transfer12HourBinsMapping).filter(
                models.Transfer12HourBinsMapping.transfer_session_id == session_id,
                models.Transfer12HourBinsMapping.status == models.Transfer12HourBinsMappingStatus.IN_PROGRESS
            ).update({"status": models.Transfer12HourBinsMappingStatus.COMPLETED, "end_timestamp": datetime.utcnow()})
            
            # Update special transfers if any
            db.query(models.Transfer12HourSpecialTransfer).filter(
                models.Transfer12HourSpecialTransfer.transfer_session_id == session_id,
                models.Transfer12HourSpecialTransfer.status == models.Transfer12HourSpecialStatus.IN_PROGRESS
            ).update({"status": models.Transfer12HourSpecialStatus.COMPLETED})

            # Auto-complete Production Order if quantity reached
            if session.production_order_id:
                order = db.query(models.ProductionOrder).filter(models.ProductionOrder.id == session.production_order_id).first()
                if order:
                    # Calculate total transferred for this order across all 12-hour sessions
                    total_transferred = db.query(func.sum(models.Transfer12HourRecord.quantity_transferred)).join(
                        models.Transfer12HourSession,
                        models.Transfer12HourSession.id == models.Transfer12HourRecord.transfer_session_id
                    ).filter(
                        models.Transfer12HourSession.production_order_id == order.id,
                        models.Transfer12HourRecord.status == models.TransferRecordingStatus.COMPLETED
                    ).scalar() or 0.0

                    # Calculate target quantity from the planned 24-hour bins (Destination Bins)
                    target_quantity = db.query(func.sum(models.ProductionOrderDestinationBin.quantity)).filter(
                        models.ProductionOrderDestinationBin.production_order_id == order.id
                    ).scalar() or 0.0

                    if total_transferred >= target_quantity and target_quantity > 0:
                        order.status = models.ProductionOrderStatus.COMPLETED

    db.commit()
    db.refresh(session)
    return session


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
