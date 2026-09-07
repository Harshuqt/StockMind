from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Annotated

from app.db.session import get_db
from app.models.organization import Organization
from app.models.membership import OrganizationMember
from app.models.role import Role
from app.models.user import User
from app.schemas.organization import OrganizationCreate, OrganizationResponse
from app.api.deps import get_current_active_user

router = APIRouter()

@router.post("/", response_model=OrganizationResponse)
async def create_organization(
    org_in: OrganizationCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    # Create Organization
    org = Organization(name=org_in.name)
    db.add(org)
    await db.flush() # To get org.id
    
    # Ensure SUPER_ADMIN role exists (simplified for now, ideally seeded on startup)
    result = await db.execute(select(Role).where(Role.name == "SUPER_ADMIN"))
    role = result.scalar_one_or_none()
    if not role:
        role = Role(name="SUPER_ADMIN", permissions={"all": True})
        db.add(role)
        await db.flush()
        
    # Add creator as SUPER_ADMIN
    member = OrganizationMember(
        user_id=current_user.id,
        organization_id=org.id,
        role_id=role.id
    )
    db.add(member)
    
    await db.commit()
    await db.refresh(org)
    return org

@router.get("/", response_model=list[OrganizationResponse])
async def read_organizations(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Organization).join(OrganizationMember).where(OrganizationMember.user_id == current_user.id)
    result = await db.execute(stmt)
    return result.scalars().all()
