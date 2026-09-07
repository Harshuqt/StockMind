from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from decimal import Decimal

class ProductBase(BaseModel):
    name: str
    sku: str
    category_id: UUID | None = None
    barcode: str | None = None
    description: str | None = None
    selling_price: Decimal | None = None
    cost_price: Decimal | None = None
    current_stock: int = 0
    min_stock: int = 0
    max_stock: int | None = None
    reorder_point: int = 0
    safety_stock: int = 0
    status: str = "Active"

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: str | None = None
    sku: str | None = None
    category_id: UUID | None = None
    barcode: str | None = None
    description: str | None = None
    selling_price: Decimal | None = None
    cost_price: Decimal | None = None
    current_stock: int | None = None
    min_stock: int | None = None
    max_stock: int | None = None
    reorder_point: int | None = None
    safety_stock: int | None = None
    status: str | None = None

class ProductResponse(ProductBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True
