from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Annotated
from uuid import UUID

from app.db.session import get_db
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerResponse, CustomerUpdate
from app.api.deps import get_current_organization_id, get_current_active_user

router = APIRouter()

@router.post("/", response_model=CustomerResponse)
async def create_customer(
    customer_in: CustomerCreate,
    org_id: Annotated[UUID, Depends(get_current_organization_id)],
    current_user: Annotated[dict, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    customer = Customer(**customer_in.model_dump(), organization_id=org_id)
    db.add(customer)
    await db.commit()
    await db.refresh(customer)
    return customer

@router.get("/", response_model=list[CustomerResponse])
async def read_customers(
    org_id: Annotated[UUID, Depends(get_current_organization_id)],
    current_user: Annotated[dict, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Customer).where(Customer.organization_id == org_id))
    return result.scalars().all()
