import uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import ForeignKey, DateTime, func
from app.models.base import Base
from datetime import datetime

class OrganizationMember(Base):
    __tablename__ = "organization_members"
    
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), primary_key=True)
    role_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("roles.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    
    user = relationship("User", back_populates="memberships")
    organization = relationship("Organization", back_populates="members")
    role = relationship("Role", back_populates="memberships")
