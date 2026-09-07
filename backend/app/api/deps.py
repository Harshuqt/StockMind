from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Annotated
from uuid import UUID

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.models.membership import OrganizationMember
from app.models.role import Role
from app.schemas.token import TokenPayload

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    token: Annotated[str, Depends(oauth2_scheme)]
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        token_data = TokenPayload(**payload)
        if token_data.sub is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    result = await db.execute(select(User).where(User.id == UUID(token_data.sub)))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_organization_id(
    x_organization_id: Annotated[UUID, Header(alias="X-Organization-Id")]
) -> UUID:
    """Extracts the Organization ID from headers"""
    return x_organization_id

def require_permission(required_permission: str):
    async def permission_checker(
        current_user: Annotated[User, Depends(get_current_active_user)],
        org_id: Annotated[UUID, Depends(get_current_organization_id)],
        db: Annotated[AsyncSession, Depends(get_db)]
    ):
        # Find membership and role
        stmt = select(Role).join(OrganizationMember).where(
            OrganizationMember.user_id == current_user.id,
            OrganizationMember.organization_id == org_id
        )
        result = await db.execute(stmt)
        role = result.scalar_one_or_none()
        
        if not role:
            raise HTTPException(status_code=403, detail="Not a member of this organization")
            
        permissions = role.permissions or {}
        # In a real app, SUPER_ADMIN might have a bypass flag here
        if role.name != "SUPER_ADMIN" and not permissions.get(required_permission, False):
            raise HTTPException(status_code=403, detail="Not enough permissions")
            
        return org_id
    return permission_checker
