from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Annotated
from uuid import UUID

from app.db.session import get_db
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate
from app.api.deps import get_current_organization_id, get_current_active_user

router = APIRouter()

@router.post("/", response_model=CategoryResponse)
async def create_category(
    category_in: CategoryCreate,
    org_id: Annotated[UUID, Depends(get_current_organization_id)],
    current_user: Annotated[dict, Depends(get_current_active_user)], # Ensuring user is logged in
    db: AsyncSession = Depends(get_db)
):
    category = Category(**category_in.model_dump(), organization_id=org_id)
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category

@router.get("/", response_model=list[CategoryResponse])
async def read_categories(
    org_id: Annotated[UUID, Depends(get_current_organization_id)],
    current_user: Annotated[dict, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Category).where(Category.organization_id == org_id))
    return result.scalars().all()
