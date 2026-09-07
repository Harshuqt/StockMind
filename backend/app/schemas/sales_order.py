from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from decimal import Decimal

class SalesOrderItemBase(BaseModel):
    product_id: UUID
    warehouse_id: UUID
    quantity: int
    unit_price: Decimal

class SalesOrderItemCreate(SalesOrderItemBase):
    pass

class SalesOrderItemResponse(SalesOrderItemBase):
    id: UUID
    
    class Config:
        from_attributes = True

class SalesOrderBase(BaseModel):
    customer_id: UUID
    order_number: str

class SalesOrderCreate(SalesOrderBase):
    items: list[SalesOrderItemCreate]

class SalesOrderResponse(SalesOrderBase):
    id: UUID
    organization_id: UUID
    status: str
    total_amount: Decimal
    created_at: datetime
    items: list[SalesOrderItemResponse] = []
    
    class Config:
        from_attributes = True

class SalesOrderStatusUpdate(BaseModel):
    status: str # 'Confirmed', 'Shipped', 'Cancelled', etc.
