import uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import String
from app.models.base import Base, TimestampMixin

class Organization(Base, TimestampMixin):
    __tablename__ = "organizations"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    members = relationship("OrganizationMember", back_populates="organization")
    categories = relationship("Category", back_populates="organization")
    products = relationship("Product", back_populates="organization")
