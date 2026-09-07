from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class AlertBase(BaseModel):
    product_id: UUID | None = None
    type: str
    message: str
    status: str = "UNREAD"

class AlertCreate(AlertBase):
    pass

class AlertResponse(AlertBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    resolved_at: datetime | None = None
    
    class Config:
        from_attributes = True
