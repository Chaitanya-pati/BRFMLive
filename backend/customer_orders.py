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
    # Eagerly load customer and items with their related models
    from sqlalchemy.orm import joinedload, selectinload
    query = query.options(
        joinedload(models.CustomerOrder.customer),
        selectinload(models.CustomerOrder.items).joinedload(models.OrderItem.finished_good),
        selectinload(models.CustomerOrder.items).joinedload(models.OrderItem.bag_size),
    )
    orders = query.order_by(models.CustomerOrder.order_id.desc()).offset(skip).limit(limit).all()

    # Bulk-fetch dispatch totals for ALL order items in ONE GROUP BY query,
    # instead of issuing two queries per item.
    item_ids = [item.order_item_id for order in orders for item in order.items]
    dispatch_totals = {}
    if item_ids:
        rows = (
            db.query(
                models.DispatchItem.order_item_id,
                func.coalesce(func.sum(models.DispatchItem.dispatched_qty_ton), 0.0).label("qty_ton"),
                func.coalesce(func.sum(models.DispatchItem.dispatched_bags), 0).label("bags"),
            )
            .filter(models.DispatchItem.order_item_id.in_(item_ids))
            .group_by(models.DispatchItem.order_item_id)
            .all()
        )
        dispatch_totals = {r.order_item_id: (float(r.qty_ton or 0.0), int(r.bags or 0)) for r in rows}

    # Enrich orders with resolved data for the frontend
    for order in orders:
        # Standardize customer data for frontend dropdowns
        if order.customer:
            order.customer_name = order.customer.customer_name
            order.city = order.customer.city
        else:
            order.customer_name = "Unknown"
            order.city = ""

        for item in order.items:
            # Resolve product name
            if item.finished_good:
                item.product_name = item.finished_good.product_name
            elif hasattr(item, 'product') and item.product:
                item.product_name = getattr(item.product, 'product_name', getattr(item.product, 'name', "Unknown Product"))
            else:
                item.product_name = "Unknown Product"

            # Apply pre-aggregated dispatch totals (defaults to 0/0 if none)
            qty_ton, bags = dispatch_totals.get(item.order_item_id, (0.0, 0))
            item.dispatched_qty = qty_ton
            item.dispatched_bags_total = bags

            # Quantity and remaining weight logic
            weight_kg = item.bag_size.weight_kg if item.bag_size else (getattr(item, 'bag_size_weight', 0) or 0)
            ordered_qty = item.quantity_ton if (item.quantity_ton and item.quantity_ton > 0) else ((item.number_of_bags * weight_kg / 1000.0) if (item.number_of_bags and weight_kg) else 0.0)
            item.remaining_qty = max(0, ordered_qty - item.dispatched_qty)

    return orders

@router.get("/{order_id}", response_model=schemas.CustomerOrder)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.CustomerOrder).filter(models.CustomerOrder.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Calculate dispatched and remaining quantities for each item
    for item in order.items:
        # Use the same bag-aware logic as main.py
        weight_kg = item.bag_size.weight_kg if item.bag_size else (getattr(item, 'bag_size_weight', 0) or 0)
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
        
        # Product name resolution
        if item.finished_good:
            item.product_name = item.finished_good.product_name
        elif hasattr(item, 'product') and item.product:
            item.product_name = getattr(item.product, 'product_name', getattr(item.product, 'name', "Unknown Product"))
        else:
            item.product_name = "Unknown Product"
        
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

@router.get("/{order_id}/traceability", response_model=dict)
def get_order_traceability(order_id: int, db: Session = Depends(get_db)):
    """
    Get complete order traceability timeline with dispatch and delivery history
    """
    order = db.query(models.CustomerOrder).filter(models.CustomerOrder.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    from sqlalchemy.orm import joinedload
    order = db.query(models.CustomerOrder).filter(
        models.CustomerOrder.order_id == order_id
    ).options(
        joinedload(models.CustomerOrder.customer),
        joinedload(models.CustomerOrder.items).joinedload(models.OrderItem.finished_good),
        joinedload(models.CustomerOrder.items).joinedload(models.OrderItem.bag_size)
    ).first()
    
    # Get all dispatches related to this order. Multi-order dispatches may
    # have a null header order_id, so include dispatch items as well.
    dispatches = db.query(models.Dispatch).outerjoin(
        models.DispatchItem,
        models.DispatchItem.dispatch_id == models.Dispatch.dispatch_id,
    ).outerjoin(
        models.OrderItem,
        models.OrderItem.order_item_id == models.DispatchItem.order_item_id,
    ).filter(
        (models.Dispatch.order_id == order_id) |
        (models.OrderItem.order_id == order_id)
    ).options(
        joinedload(models.Dispatch.driver)
    ).distinct().order_by(models.Dispatch.actual_dispatch_date.asc()).all()
    
    # Build timeline stages
    timeline = []
    
    # Stage 1: Order Created
    timeline.append({
        "stage": 1,
        "name": "Order Created",
        "status": "Completed",
        "date": order.order_date,
        "details": f"Order {order.order_code} created for {order.customer.customer_name if order.customer else 'Unknown'}"
    })
    
    # Stage 2: Order Confirmed
    timeline.append({
        "stage": 2,
        "name": "Order Confirmed",
        "status": "Completed" if order.order_status != 'PENDING' else "Pending",
        "date": order.order_date,
        "details": f"Order status: {order.order_status}"
    })
    
    # Stage 3-N: Dispatches
    for idx, dispatch in enumerate(dispatches, start=3):
        is_external = (dispatch.transport_type or "INTERNAL").upper() == "EXTERNAL"
        driver_name = (
            dispatch.external_driver_name
            if is_external
            else (dispatch.driver.driver_name if dispatch.driver else "Unknown")
        )
        transport_label = "External transport" if is_external else "Internal transport"
        vehicle_number = (
            dispatch.external_vehicle_number
            if is_external
            else (dispatch.truck.truck_number if dispatch.truck else None)
        )
        timeline.append({
            "stage": idx,
            "name": f"Dispatch #{dispatch.dispatch_id}",
            "status": "External dispatch" if is_external else (dispatch.status or "DISPATCHED"),
            "date": dispatch.actual_dispatch_date,
            "details": (
                f"{transport_label} | Driver: {driver_name}"
                f"{f' | Vehicle: {vehicle_number}' if vehicle_number else ''}"
                f" | {dispatch.dispatched_quantity_ton} tons"
                f" | {dispatch.dispatched_bags or 0} bags"
            )
        })
    
    # Final Stage: Delivery
    if order.completed_time:
        timeline.append({
            "stage": len(timeline) + 1,
            "name": "Order Completed",
            "status": "Completed",
            "date": order.completed_time,
            "details": f"Order fully delivered and completed"
        })
    elif dispatches and any(d.status == "DELIVERED" for d in dispatches):
        last_delivery = max([d.delivery_date for d in dispatches if d.delivery_date], default=None)
        if last_delivery:
            timeline.append({
                "stage": len(timeline) + 1,
                "name": "Delivery Received",
                "status": "Completed",
                "date": last_delivery,
                "details": f"Order delivered to customer"
            })
    
    # Calculate order summary
    total_dispatched = sum(d.dispatched_quantity_ton for d in dispatches)
    total_dispatched_bags = sum(d.dispatched_bags or 0 for d in dispatches)
    
    return {
        "order_id": order.order_id,
        "order_code": order.order_code,
        "customer_name": order.customer.customer_name if order.customer else "Unknown",
        "customer_city": order.customer.city if order.customer else "",
        "order_status": order.order_status,
        "order_date": order.order_date,
        "completed_time": order.completed_time,
        "remarks": order.remarks,
        "total_items": len(order.items),
        "dispatch_count": len(dispatches),
        "total_dispatched_tons": total_dispatched,
        "total_dispatched_bags": total_dispatched_bags,
        "timeline": timeline,
        "items": [
            {
                "order_item_id": item.order_item_id,
                "product_name": item.finished_good.product_name if item.finished_good else "Unknown",
                "quantity_ton": item.quantity_ton,
                "number_of_bags": item.number_of_bags,
                "price_per_ton": item.price_per_ton,
                "price_per_bag": item.price_per_bag
            }
            for item in order.items
        ]
    }

@router.delete("/{order_id}")
def delete_order(order_id: int, db: Session = Depends(get_db)):
    db_order = db.query(models.CustomerOrder).filter(models.CustomerOrder.order_id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    db.delete(db_order)
    db.commit()
    return {"message": "Order deleted successfully"}
