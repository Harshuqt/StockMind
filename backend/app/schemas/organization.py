from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class OrganizationBase(BaseModel):
    name: str

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationResponse(OrganizationBase):
    id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True
