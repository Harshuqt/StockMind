from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime

class SupplierBase(BaseModel):
    company_name: str
    contact_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    address: str | None = None
    tax_id: str | None = None
    status: str = "Active"

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(SupplierBase):
    company_name: str | None = None

class SupplierResponse(SupplierBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True
