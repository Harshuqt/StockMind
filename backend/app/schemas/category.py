from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class CategoryBase(BaseModel):
    name: str
    parent_id: UUID | None = None

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True
