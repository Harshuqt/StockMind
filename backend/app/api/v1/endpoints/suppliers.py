from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Annotated
from uuid import UUID

from app.db.session import get_db
from app.models.supplier import Supplier
from app.schemas.supplier import SupplierCreate, SupplierResponse, SupplierUpdate
from app.api.deps import get_current_organization_id, get_current_active_user

router = APIRouter()

@router.post("/", response_model=SupplierResponse)
async def create_supplier(
    supplier_in: SupplierCreate,
    org_id: Annotated[UUID, Depends(get_current_organization_id)],
    current_user: Annotated[dict, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    supplier = Supplier(**supplier_in.model_dump(), organization_id=org_id)
    db.add(supplier)
    await db.commit()
    await db.refresh(supplier)
    return supplier

@router.get("/", response_model=list[SupplierResponse])
async def read_suppliers(
    org_id: Annotated[UUID, Depends(get_current_organization_id)],
    current_user: Annotated[dict, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Supplier).where(Supplier.organization_id == org_id))
    return result.scalars().all()
