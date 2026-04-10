from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
import models
import schemas

router = APIRouter(prefix="/api/trucks", tags=["trucks"])


def get_branch_id(x_branch_id: Optional[str] = Header(None)) -> Optional[int]:
    if x_branch_id:
        try:
            return int(x_branch_id)
        except ValueError:
            return None
    return None


@router.post("", response_model=schemas.Truck)
def create_truck(truck: schemas.TruckCreate,
                 db: Session = Depends(get_db),
                 branch_id: Optional[int] = Depends(get_branch_id)):
    truck_data = truck.dict()
    if branch_id and not truck_data.get('branch_id'):
        truck_data['branch_id'] = branch_id

    if not truck_data.get('branch_id'):
        raise HTTPException(status_code=400, detail="branch_id is required")

    existing = db.query(models.Truck).filter(
        models.Truck.truck_number == truck_data['truck_number']
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Truck number already exists")

    db_truck = models.Truck(**truck_data)
    db.add(db_truck)
    try:
        db.commit()
        db.refresh(db_truck)
        return db_truck
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("", response_model=List[schemas.Truck])
def get_trucks(skip: int = 0,
               limit: int = 100,
               branch_id: Optional[int] = Depends(get_branch_id),
               db: Session = Depends(get_db)):
    query = db.query(models.Truck)
    if branch_id:
        query = query.filter(models.Truck.branch_id == branch_id)
    return query.order_by(models.Truck.truck_id.desc()).offset(skip).limit(limit).all()


@router.get("/{truck_id}", response_model=schemas.Truck)
def get_truck(truck_id: int, db: Session = Depends(get_db)):
    truck = db.query(models.Truck).filter(models.Truck.truck_id == truck_id).first()
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")
    return truck


@router.put("/{truck_id}", response_model=schemas.Truck)
def update_truck(truck_id: int,
                 truck_update: schemas.TruckUpdate,
                 db: Session = Depends(get_db)):
    db_truck = db.query(models.Truck).filter(models.Truck.truck_id == truck_id).first()
    if not db_truck:
        raise HTTPException(status_code=404, detail="Truck not found")

    update_data = truck_update.dict(exclude_unset=True)

    if 'truck_number' in update_data and update_data['truck_number']:
        existing = db.query(models.Truck).filter(
            models.Truck.truck_number == update_data['truck_number'],
            models.Truck.truck_id != truck_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Truck number already exists")

    for key, value in update_data.items():
        setattr(db_truck, key, value)

    try:
        db.commit()
        db.refresh(db_truck)
        return db_truck
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.delete("/{truck_id}")
def delete_truck(truck_id: int, db: Session = Depends(get_db)):
    db_truck = db.query(models.Truck).filter(models.Truck.truck_id == truck_id).first()
    if not db_truck:
        raise HTTPException(status_code=404, detail="Truck not found")
    db.delete(db_truck)
    db.commit()
    return {"message": "Truck deleted successfully"}
