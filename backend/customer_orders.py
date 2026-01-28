from sqlalchemy import func
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
        
        # Remove quantity_type from item_data as it's not in the database
        item_data.pop('quantity_type', None)
        
        # Determine quantity type logic from data presence
        is_bag_order = item_data.get('number_of_bags', 0) > 0 or item_data.get('bag_size_weight') is not None
        
        if is_bag_order:
            # Bag-based logic
            bag_weight = item_data.pop('bag_size_weight', None)
            if bag_weight:
                # Find or create BagSize
                bag_size = db.query(models.BagSize).filter(
                    models.BagSize.weight_kg == bag_weight,
                    models.BagSize.branch_id == db_order.branch_id
                ).first()
                if not bag_size:
                    bag_size = models.BagSize(weight_kg=bag_weight, branch_id=db_order.branch_id)
                    db.add(bag_size)
                    db.flush()
                item_data['bag_size_id'] = bag_size.id
            
            # Ensure tons fields are 0 for bag orders
            item_data['quantity_ton'] = 0.0
            item_data['price_per_ton'] = 0.0
        else:
            # Ton-based logic
            item_data.pop('bag_size_weight', None)
            item_data['bag_size_id'] = None
            item_data['number_of_bags'] = 0
            item_data['price_per_bag'] = 0.0
                
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
    
    # Calculate dispatched and remaining quantities for each item
    for item in order.items:
        # Use the same bag-aware logic as main.py
        weight_kg = item.bag_size.weight_kg if item.bag_size else (item.bag_size_weight or 0)
        ordered_qty = item.quantity_ton if (item.quantity_ton and item.quantity_ton > 0) else ((item.number_of_bags * weight_kg / 1000.0) if (item.number_of_bags and weight_kg) else 0.0)
        
        dispatched = db.query(func.sum(models.DispatchItem.dispatched_qty_ton)).filter(
            models.DispatchItem.order_item_id == item.order_item_id
        ).scalar() or 0.0
        
        dispatched_bags = db.query(func.sum(models.DispatchItem.dispatched_bags)).filter(
            models.DispatchItem.order_item_id == item.order_item_id
        ).scalar() or 0

        # Enhance the item object for schema serialization
        item.dispatched_qty = dispatched
        item.remaining_qty = max(0, ordered_qty - dispatched)
        item.dispatched_bags_total = dispatched_bags
        item.product_name = (
            item.finished_good.product_name if item.finished_good 
            else (item.product.name if hasattr(item, 'product') and item.product else "Unknown Product")
        )
        
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
        
        # Remove quantity_type from item_data as it's not in the database
        item_data.pop('quantity_type', None)
        
        # Determine quantity type logic from data presence
        is_bag_order = item_data.get('number_of_bags', 0) > 0 or item_data.get('bag_size_weight') is not None
        
        if is_bag_order:
            # Bag-based logic
            bag_weight = item_data.pop('bag_size_weight', None)
            if bag_weight:
                # Find or create BagSize
                bag_size = db.query(models.BagSize).filter(
                    models.BagSize.weight_kg == bag_weight,
                    models.BagSize.branch_id == db_order.branch_id
                ).first()
                if not bag_size:
                    bag_size = models.BagSize(weight_kg=bag_weight, branch_id=db_order.branch_id)
                    db.add(bag_size)
                    db.flush()
                item_data['bag_size_id'] = bag_size.id
            
            # Ensure tons fields are 0 for bag orders
            item_data['quantity_ton'] = 0.0
            item_data['price_per_ton'] = 0.0
        else:
            # Ton-based logic
            item_data.pop('bag_size_weight', None)
            item_data['bag_size_id'] = None
            item_data['number_of_bags'] = 0
            item_data['price_per_bag'] = 0.0
                
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
