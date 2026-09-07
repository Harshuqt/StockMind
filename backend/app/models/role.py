import uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import String
from sqlalchemy.dialects.postgresql import JSONB
from app.models.base import Base

class Role(Base):
    __tablename__ = "roles"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    permissions: Mapped[dict] = mapped_column(JSONB, nullable=True)
    
    memberships = relationship("OrganizationMember", back_populates="role")
