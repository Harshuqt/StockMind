from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class WarehouseBase(BaseModel):
    name: str
    address: str | None = None
    manager_id: UUID | None = None
    is_active: bool = True

class WarehouseCreate(WarehouseBase):
    pass

class WarehouseUpdate(WarehouseBase):
    name: str | None = None

class WarehouseResponse(WarehouseBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True
