from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Annotated
from uuid import UUID

from app.db.session import get_db
from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem
from app.models.warehouse_inventory import WarehouseInventory
from app.models.inventory_transaction import InventoryTransaction
from app.models.product import Product
from app.schemas.purchase_order import PurchaseOrderCreate, PurchaseOrderResponse, PurchaseOrderReceiveRequest
from app.api.deps import get_current_organization_id, get_current_active_user

router = APIRouter()

@router.get("/", response_model=list[PurchaseOrderResponse])
async def read_purchase_orders(
    org_id: Annotated[UUID, Depends(get_current_organization_id)],
    current_user: Annotated[dict, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.items))
        .where(PurchaseOrder.organization_id == org_id)
        .order_by(PurchaseOrder.created_at.desc())
    )
    return result.scalars().all()

@router.post("/", response_model=PurchaseOrderResponse)
async def create_purchase_order(
    po_in: PurchaseOrderCreate,
    org_id: Annotated[UUID, Depends(get_current_organization_id)],
    current_user: Annotated[dict, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    po = PurchaseOrder(
        organization_id=org_id,
        supplier_id=po_in.supplier_id,
        po_number=po_in.po_number,
        expected_delivery=po_in.expected_delivery
    )
    db.add(po)
    await db.flush()
    
    for item in po_in.items:
        po_item = PurchaseOrderItem(
            purchase_order_id=po.id,
            product_id=item.product_id,
            ordered_quantity=item.ordered_quantity,
            unit_cost=item.unit_cost
        )
        db.add(po_item)
        
    await db.commit()
    await db.refresh(po, ['items'])
    return po

@router.post("/{po_id}/receive")
async def receive_purchase_order(
    po_id: UUID,
    receive_in: PurchaseOrderReceiveRequest,
    org_id: Annotated[UUID, Depends(get_current_organization_id)],
    current_user: Annotated[dict, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    # Fetch PO and verify org
    po_result = await db.execute(select(PurchaseOrder).options(selectinload(PurchaseOrder.items)).where(
        PurchaseOrder.id == po_id, PurchaseOrder.organization_id == org_id
    ))
    po = po_result.scalar_one_or_none()
    
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
        
    for item in po.items:
        qty_received = receive_in.items.get(item.id, 0)
        if qty_received <= 0:
            continue
            
        # Update PO item
        item.received_quantity += qty_received
        
        # Get or create inventory
        inv_result = await db.execute(select(WarehouseInventory).where(
            WarehouseInventory.product_id == item.product_id,
            WarehouseInventory.warehouse_id == receive_in.warehouse_id
        ))
        inventory = inv_result.scalar_one_or_none()
        if not inventory:
            inventory = WarehouseInventory(product_id=item.product_id, warehouse_id=receive_in.warehouse_id, quantity=0)
            db.add(inventory)
            
        inventory.quantity += qty_received
        
        # Update global product stock
        prod_result = await db.execute(select(Product).where(Product.id == item.product_id))
        product = prod_result.scalar_one()
        product.current_stock += qty_received
        
        # Create Transaction
        tx = InventoryTransaction(
            organization_id=org_id,
            product_id=item.product_id,
            warehouse_id=receive_in.warehouse_id,
            transaction_type="STOCK_IN",
            quantity_changed=qty_received,
            reference_id=str(po.id),
            performed_by=current_user.id
        )
        db.add(tx)
        
    # Mark as received or partially received based on logic
    # Simplified here to just mark Received if any item is received
    po.status = "Received"
    await db.commit()
    
    return {"message": "Purchase order received and inventory updated"}

@router.delete("/{po_id}")
async def delete_purchase_order(
    po_id: UUID,
    org_id: Annotated[UUID, Depends(get_current_organization_id)],
    current_user: Annotated[dict, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    po_result = await db.execute(select(PurchaseOrder).where(
        PurchaseOrder.id == po_id, 
        PurchaseOrder.organization_id == org_id
    ))
    po = po_result.scalar_one_or_none()
    
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
        
    await db.delete(po)
    await db.commit()
    
    return {"message": "Purchase order deleted"}
