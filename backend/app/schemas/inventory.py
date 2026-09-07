from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class WarehouseInventoryResponse(BaseModel):
    product_id: UUID
    warehouse_id: UUID
    quantity: int
    reserved_quantity: int
    last_updated: datetime
    
    class Config:
        from_attributes = True

class InventoryAdjustmentRequest(BaseModel):
    product_id: UUID
    warehouse_id: UUID
    transaction_type: str # 'STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'RETURN', 'DAMAGED', 'EXPIRED', 'SET'
    quantity_changed: int | None = None # Can be negative, optional if new_quantity is provided
    new_quantity: int | None = None # Used for exact stock setting
    reference_id: str | None = None
    notes: str | None = None

class InventoryTransferRequest(BaseModel):
    product_id: UUID
    from_warehouse_id: UUID
    to_warehouse_id: UUID
    quantity: int # Must be positive
    notes: str | None = None

class InventoryTransactionResponse(BaseModel):
    id: UUID
    product_id: UUID
    warehouse_id: UUID
    transaction_type: str
    quantity_changed: int
    reference_id: str | None = None
    performed_by: UUID
    notes: str | None = None
    created_at: datetime
    
    class Config:
        from_attributes = True
