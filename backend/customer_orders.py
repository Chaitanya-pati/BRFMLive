from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
import models
import schemas

router = APIRouter(prefix="/api/customer-orders", tags=["customer-orders"])

def get_branch_id(x_branch_id: Optional[str] = Header(None)) -> Optional[int]:
    if x_branch_id:
        try:
            return int(x_branch_id)
        except ValueError:
            return None
    return None

@router.post("", response_model=schemas.CustomerOrder)
def create_order(order: schemas.CustomerOrderCreate, 
                 db: Session = Depends(get_db),
                 branch_id: Optional[int] = Depends(get_branch_id)):
    order_data = order.dict(exclude={'items'})
    if branch_id and not order_data.get('branch_id'):
        order_data['branch_id'] = branch_id
    
    if not order_data.get('branch_id'):
        raise HTTPException(status_code=400, detail="branch_id is required")
        
    db_order = models.CustomerOrder(**order_data)
    db.add(db_order)
    db.flush() # Get order_id
    
    for item in order.items:
        item_data = item.dict()
        item_data['order_id'] = db_order.order_id
        item_data['branch_id'] = db_order.branch_id
        db_item = models.OrderItem(**item_data)
        db.add(db_item)
        
    try:
        db.commit()
        db.refresh(db_order)
        return db_order
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("", response_model=List[schemas.CustomerOrder])
def get_orders(skip: int = 0, 
               limit: int = 100, 
               branch_id: Optional[int] = Depends(get_branch_id),
               db: Session = Depends(get_db)):
    query = db.query(models.CustomerOrder)
    if branch_id:
        query = query.filter(models.CustomerOrder.branch_id == branch_id)
    return query.order_by(models.CustomerOrder.order_id.desc()).offset(skip).limit(limit).all()

@router.get("/{order_id}", response_model=schemas.CustomerOrder)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.CustomerOrder).filter(models.CustomerOrder.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.put("/{order_id}", response_model=schemas.CustomerOrder)
def update_order(order_id: int, 
                 order_update: schemas.CustomerOrderCreate, 
                 db: Session = Depends(get_db)):
    db_order = db.query(models.CustomerOrder).filter(models.CustomerOrder.order_id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = order_update.dict(exclude={'items'}, exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_order, key, value)
        
    # Simplify: Replace all items for now
    db.query(models.OrderItem).filter(models.OrderItem.order_id == order_id).delete()
    for item in order_update.items:
        item_data = item.dict()
        item_data['order_id'] = db_order.order_id
        item_data['branch_id'] = db_order.branch_id
        db_item = models.OrderItem(**item_data)
        db.add(db_item)
        
    db.commit()
    db.refresh(db_order)
    return db_order

@router.delete("/{order_id}")
def delete_order(order_id: int, db: Session = Depends(get_db)):
    db_order = db.query(models.CustomerOrder).filter(models.CustomerOrder.order_id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    db.delete(db_order)
    db.commit()
    return {"message": "Order deleted successfully"}
