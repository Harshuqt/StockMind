from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Annotated
from uuid import UUID

from app.db.session import get_db
from app.models.product import Product
from app.models.warehouse_inventory import WarehouseInventory
from app.models.inventory_transaction import InventoryTransaction
from app.schemas.inventory import (
    InventoryAdjustmentRequest, 
    InventoryTransferRequest,
    WarehouseInventoryResponse,
    InventoryTransactionResponse
)
from app.api.deps import get_current_organization_id, get_current_active_user

router = APIRouter()

@router.post("/adjust")
async def adjust_inventory(
    adjustment: InventoryAdjustmentRequest,
    org_id: Annotated[UUID, Depends(get_current_organization_id)],
    current_user: Annotated[dict, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    # Verify product belongs to org
    prod_result = await db.execute(select(Product).where(Product.id == adjustment.product_id, Product.organization_id == org_id))
    product = prod_result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Get or create warehouse inventory
    inv_result = await db.execute(select(WarehouseInventory).where(
        WarehouseInventory.product_id == adjustment.product_id,
        WarehouseInventory.warehouse_id == adjustment.warehouse_id
    ))
    inventory = inv_result.scalar_one_or_none()
    
    if not inventory:
        inventory = WarehouseInventory(
            product_id=adjustment.product_id,
            warehouse_id=adjustment.warehouse_id,
            quantity=0
        )
        db.add(inventory)
        
    # Calculate quantity_changed if new_quantity is provided
    if adjustment.transaction_type == 'SET' and adjustment.new_quantity is not None:
        actual_change = adjustment.new_quantity - inventory.quantity
    elif adjustment.quantity_changed is not None:
        actual_change = adjustment.quantity_changed
    else:
        raise HTTPException(status_code=400, detail="Must provide either quantity_changed or new_quantity")
        
    # Validation: prevent negative total stock if trying to remove
    if actual_change < 0 and (inventory.quantity + actual_change < inventory.reserved_quantity):
        raise HTTPException(status_code=400, detail="Insufficient available stock to adjust")

    # 1. Update warehouse inventory
    inventory.quantity += actual_change
    
    # 2. Update global product stock
    product.current_stock += actual_change
    
    # 3. Create immutable transaction
    transaction = InventoryTransaction(
        organization_id=org_id,
        product_id=adjustment.product_id,
        warehouse_id=adjustment.warehouse_id,
        transaction_type=adjustment.transaction_type,
        quantity_changed=actual_change,
        reference_id=adjustment.reference_id,
        performed_by=current_user.id,
        notes=adjustment.notes
    )
    db.add(transaction)
    
    # Check for low stock alert if stock was reduced
    if actual_change < 0:
        from app.services.alert_service import check_and_create_low_stock_alert
        await check_and_create_low_stock_alert(db, adjustment.product_id, org_id)
        
    await db.commit()
    return {"message": "Inventory adjusted successfully"}

@router.post("/transfer")
async def transfer_inventory(
    transfer: InventoryTransferRequest,
    org_id: Annotated[UUID, Depends(get_current_organization_id)],
    current_user: Annotated[dict, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    if transfer.quantity <= 0:
        raise HTTPException(status_code=400, detail="Transfer quantity must be positive")
        
    if transfer.from_warehouse_id == transfer.to_warehouse_id:
        raise HTTPException(status_code=400, detail="Cannot transfer to the same warehouse")

    # Verify product belongs to org
    prod_result = await db.execute(select(Product).where(Product.id == transfer.product_id, Product.organization_id == org_id))
    if not prod_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Product not found")

    # Get Source Inventory
    src_result = await db.execute(select(WarehouseInventory).where(
        WarehouseInventory.product_id == transfer.product_id,
        WarehouseInventory.warehouse_id == transfer.from_warehouse_id
    ))
    src_inventory = src_result.scalar_one_or_none()
    
    if not src_inventory or (src_inventory.quantity - src_inventory.reserved_quantity < transfer.quantity):
        raise HTTPException(status_code=400, detail="Insufficient available stock in source warehouse")

    # Get or create Destination Inventory
    dest_result = await db.execute(select(WarehouseInventory).where(
        WarehouseInventory.product_id == transfer.product_id,
        WarehouseInventory.warehouse_id == transfer.to_warehouse_id
    ))
    dest_inventory = dest_result.scalar_one_or_none()
    
    if not dest_inventory:
        dest_inventory = WarehouseInventory(
            product_id=transfer.product_id,
            warehouse_id=transfer.to_warehouse_id,
            quantity=0
        )
        db.add(dest_inventory)

    # 1. Update inventories
    src_inventory.quantity -= transfer.quantity
    dest_inventory.quantity += transfer.quantity
    
    # 2. Create transactions
    tx_out = InventoryTransaction(
        organization_id=org_id,
        product_id=transfer.product_id,
        warehouse_id=transfer.from_warehouse_id,
        transaction_type="TRANSFER_OUT",
        quantity_changed=-transfer.quantity,
        performed_by=current_user.id,
        notes=transfer.notes
    )
    
    tx_in = InventoryTransaction(
        organization_id=org_id,
        product_id=transfer.product_id,
        warehouse_id=transfer.to_warehouse_id,
        transaction_type="TRANSFER_IN",
        quantity_changed=transfer.quantity,
        performed_by=current_user.id,
        notes=transfer.notes
    )
    
    db.add_all([tx_out, tx_in])
    await db.commit()
    return {"message": "Inventory transferred successfully"}

@router.get("/transactions", response_model=list[InventoryTransactionResponse])
async def get_transactions(
    org_id: Annotated[UUID, Depends(get_current_organization_id)],
    current_user: Annotated[dict, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
    product_id: UUID | None = None,
    warehouse_id: UUID | None = None,
    limit: int = 50
):
    stmt = select(InventoryTransaction).where(InventoryTransaction.organization_id == org_id)
    if product_id:
        stmt = stmt.where(InventoryTransaction.product_id == product_id)
    if warehouse_id:
        stmt = stmt.where(InventoryTransaction.warehouse_id == warehouse_id)
        
    stmt = stmt.order_by(InventoryTransaction.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()
