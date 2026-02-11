from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
import models
import schemas

router = APIRouter(prefix="/api/drivers", tags=["drivers"])

def get_branch_id(x_branch_id: Optional[str] = Header(None)) -> Optional[int]:
    if x_branch_id:
        try:
            return int(x_branch_id)
        except ValueError:
            return None
    return None

@router.post("", response_model=schemas.Driver)
def create_driver(driver: schemas.DriverCreate, 
                  db: Session = Depends(get_db),
                  branch_id: Optional[int] = Depends(get_branch_id)):
    driver_data = driver.dict()
    if branch_id and not driver_data.get('branch_id'):
        driver_data['branch_id'] = branch_id
    
    if not driver_data.get('branch_id'):
        raise HTTPException(status_code=400, detail="branch_id is required")
        
    db_driver = models.Driver(**driver_data)
    db.add(db_driver)
    try:
        db.commit()
        db.refresh(db_driver)
        return db_driver
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("", response_model=List[schemas.Driver])
def get_drivers(skip: int = 0, 
                limit: int = 100, 
                branch_id: Optional[int] = Depends(get_branch_id),
                db: Session = Depends(get_db)):
    query = db.query(models.Driver)
    if branch_id:
        query = query.filter(models.Driver.branch_id == branch_id)
    return query.order_by(models.Driver.driver_id.desc()).offset(skip).limit(limit).all()

@router.get("/{driver_id}", response_model=schemas.Driver)
def get_driver(driver_id: int, db: Session = Depends(get_db)):
    driver = db.query(models.Driver).filter(models.Driver.driver_id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    return driver

@router.put("/{driver_id}", response_model=schemas.Driver)
def update_driver(driver_id: int, 
                  driver_update: schemas.DriverCreate, 
                  db: Session = Depends(get_db)):
    db_driver = db.query(models.Driver).filter(models.Driver.driver_id == driver_id).first()
    if not db_driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    update_data = driver_update.dict(exclude_unset=True)
    if 'branch_id' in update_data and update_data['branch_id'] is None:
        del update_data['branch_id']
        
    for key, value in update_data.items():
        setattr(db_driver, key, value)
        
    db.commit()
    db.refresh(db_driver)
    return db_driver

@router.delete("/{driver_id}")
def delete_driver(driver_id: int, db: Session = Depends(get_db)):
    db_driver = db.query(models.Driver).filter(models.Driver.driver_id == driver_id).first()
    if not db_driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    db.delete(db_driver)
    db.commit()
    return {"message": "Driver deleted successfully"}
