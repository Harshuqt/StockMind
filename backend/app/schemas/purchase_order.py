from pydantic import BaseModel
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal

class PurchaseOrderItemBase(BaseModel):
    product_id: UUID
    ordered_quantity: int
    unit_cost: Decimal

class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    pass

class PurchaseOrderItemResponse(PurchaseOrderItemBase):
    id: UUID
    received_quantity: int
    
    class Config:
        from_attributes = True

class PurchaseOrderBase(BaseModel):
    supplier_id: UUID
    po_number: str
    expected_delivery: date | None = None

class PurchaseOrderCreate(PurchaseOrderBase):
    items: list[PurchaseOrderItemCreate]

class PurchaseOrderResponse(PurchaseOrderBase):
    id: UUID
    organization_id: UUID
    status: str
    created_at: datetime
    items: list[PurchaseOrderItemResponse] = []
    
    class Config:
        from_attributes = True

class PurchaseOrderReceiveRequest(BaseModel):
    warehouse_id: UUID
    items: dict[UUID, int] # mapping of purchase_order_item_id to quantity received
