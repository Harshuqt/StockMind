from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Annotated
from uuid import UUID

from app.db.session import get_db
from app.models.warehouse import Warehouse
from app.schemas.warehouse import WarehouseCreate, WarehouseResponse, WarehouseUpdate
from app.api.deps import get_current_organization_id, get_current_active_user

router = APIRouter()

@router.post("/", response_model=WarehouseResponse)
async def create_warehouse(
    warehouse_in: WarehouseCreate,
    org_id: Annotated[UUID, Depends(get_current_organization_id)],
    current_user: Annotated[dict, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    warehouse = Warehouse(**warehouse_in.model_dump(), organization_id=org_id)
    db.add(warehouse)
    await db.commit()
    await db.refresh(warehouse)
    return warehouse

@router.get("/", response_model=list[WarehouseResponse])
async def read_warehouses(
    org_id: Annotated[UUID, Depends(get_current_organization_id)],
    current_user: Annotated[dict, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Warehouse).where(Warehouse.organization_id == org_id))
    return result.scalars().all()

@router.put("/{warehouse_id}", response_model=WarehouseResponse)
async def update_warehouse(
    warehouse_id: UUID,
    warehouse_in: WarehouseUpdate,
    org_id: Annotated[UUID, Depends(get_current_organization_id)],
    current_user: Annotated[dict, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Warehouse).where(
        Warehouse.id == warehouse_id, 
        Warehouse.organization_id == org_id
    ))
    warehouse = result.scalar_one_or_none()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
        
    update_data = warehouse_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(warehouse, field, value)
        
    await db.commit()
    await db.refresh(warehouse)
    return warehouse
