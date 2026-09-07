from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime

class CustomerBase(BaseModel):
    name: str
    email: EmailStr | None = None
    phone: str | None = None
    company: str | None = None
    address: str | None = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(CustomerBase):
    name: str | None = None

class CustomerResponse(CustomerBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True
