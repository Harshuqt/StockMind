import uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import String, ForeignKey, Text, DateTime, func
from app.models.base import Base
from datetime import datetime

class Alert(Base):
    __tablename__ = "alerts"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    product_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=True, index=True)
    
    type: Mapped[str] = mapped_column(String(50), nullable=False) # 'LOW_STOCK', 'OUT_OF_STOCK', 'SYSTEM'
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="UNREAD") # 'UNREAD', 'READ', 'RESOLVED'
    
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    
    organization = relationship("Organization")
    product = relationship("Product")
