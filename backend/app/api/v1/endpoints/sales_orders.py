from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Annotated
from uuid import UUID

from app.db.session import get_db
from app.models.sales_order import SalesOrder, SalesOrderItem
from app.models.warehouse_inventory import WarehouseInventory
from app.models.inventory_transaction import InventoryTransaction
from app.models.product import Product
from app.schemas.sales_order import SalesOrderCreate, SalesOrderResponse, SalesOrderStatusUpdate
from app.api.deps import get_current_organization_id, get_current_active_user

router = APIRouter()

@router.get("/", response_model=list[SalesOrderResponse])
async def read_sales_orders(
    org_id: Annotated[UUID, Depends(get_current_organization_id)],
    current_user: Annotated[dict, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(SalesOrder)
        .options(selectinload(SalesOrder.items))
        .where(SalesOrder.organization_id == org_id)
        .order_by(SalesOrder.created_at.desc())
    )
    return result.scalars().all()

@router.post("/", response_model=SalesOrderResponse)
async def create_sales_order(
    order_in: SalesOrderCreate,
    org_id: Annotated[UUID, Depends(get_current_organization_id)],
    current_user: Annotated[dict, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    total_amount = sum(item.quantity * float(item.unit_price) for item in order_in.items)
    
    order = SalesOrder(
        organization_id=org_id,
        customer_id=order_in.customer_id,
        order_number=order_in.order_number,
        total_amount=total_amount,
        status="Created"
    )
    db.add(order)
    await db.flush()
    
    for item in order_in.items:
        order_item = SalesOrderItem(
            sales_order_id=order.id,
            product_id=item.product_id,
            warehouse_id=item.warehouse_id,
            quantity=item.quantity,
            unit_price=item.unit_price
        )
        db.add(order_item)
        
    await db.commit()
    await db.refresh(order, ['items'])
    return order

@router.post("/{order_id}/status")
async def update_sales_order_status(
    order_id: UUID,
    status_update: SalesOrderStatusUpdate,
    org_id: Annotated[UUID, Depends(get_current_organization_id)],
    current_user: Annotated[dict, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    order_result = await db.execute(select(SalesOrder).options(selectinload(SalesOrder.items)).where(
        SalesOrder.id == order_id, SalesOrder.organization_id == org_id
    ))
    order = order_result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Sales order not found")
        
    new_status = status_update.status
    
    # State Machine Logic
    if new_status == "Confirmed" and order.status == "Created":
        # Reserve stock
        for item in order.items:
            inv_result = await db.execute(select(WarehouseInventory).where(
                WarehouseInventory.product_id == item.product_id,
                WarehouseInventory.warehouse_id == item.warehouse_id
            ))
            inventory = inv_result.scalar_one_or_none()
            
            if not inventory or (inventory.quantity - inventory.reserved_quantity < item.quantity):
                raise HTTPException(status_code=400, detail=f"Insufficient available stock to confirm order for product {item.product_id}")
            
            inventory.reserved_quantity += item.quantity
            
    elif new_status == "Shipped" and order.status in ["Confirmed", "Processing", "Packed"]:
        # Deduct reserved and create transaction
        for item in order.items:
            inv_result = await db.execute(select(WarehouseInventory).where(
                WarehouseInventory.product_id == item.product_id,
                WarehouseInventory.warehouse_id == item.warehouse_id
            ))
            inventory = inv_result.scalar_one()
            
            inventory.reserved_quantity -= item.quantity
            inventory.quantity -= item.quantity
            
            prod_result = await db.execute(select(Product).where(Product.id == item.product_id))
            product = prod_result.scalar_one()
            product.current_stock -= item.quantity
            
            tx = InventoryTransaction(
                organization_id=org_id,
                product_id=item.product_id,
                warehouse_id=item.warehouse_id,
                transaction_type="STOCK_OUT",
                quantity_changed=-item.quantity,
                reference_id=str(order.id),
                performed_by=current_user.id
            )
            db.add(tx)
            
            # Check for low stock alert
            from app.services.alert_service import check_and_create_low_stock_alert
            await check_and_create_low_stock_alert(db, item.product_id, org_id)
            
    elif new_status == "Cancelled" and order.status not in ["Shipped", "Delivered"]:
        # Release reservations if confirmed
        if order.status in ["Confirmed", "Processing", "Packed"]:
            for item in order.items:
                inv_result = await db.execute(select(WarehouseInventory).where(
                    WarehouseInventory.product_id == item.product_id,
                    WarehouseInventory.warehouse_id == item.warehouse_id
                ))
                inventory = inv_result.scalar_one()
                inventory.reserved_quantity -= item.quantity
                
    order.status = new_status
    await db.commit()
    
    return {"message": f"Order status updated to {new_status}"}
