from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Annotated

from app.db.session import get_db
from app.core import security
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse
from app.schemas.token import Token
from app.api.deps import get_current_active_user

router = APIRouter()

from app.models.organization import Organization
from pydantic import BaseModel, EmailStr

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None
    organization_name: str

from app.models.role import Role
from app.models.membership import OrganizationMember

@router.post("/register", response_model=UserResponse)
async def register(user_in: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed_password = security.get_password_hash(user_in.password)
    user = User(email=user_in.email, hashed_password=hashed_password)
    db.add(user)
    
    org = Organization(name=user_in.organization_name)
    db.add(org)
    
    # Check if admin role exists
    role_result = await db.execute(select(Role).where(Role.name == "Admin"))
    role = role_result.scalar_one_or_none()
    if not role:
        role = Role(name="Admin", permissions={"all": True})
        db.add(role)
        
    await db.flush() # flush to get org.id and user.id
    
    membership = OrganizationMember(user_id=user.id, organization_id=org.id, role_id=role.id)
    db.add(membership)
    
    # Auto-seed defaults for the new organization so the UI dropdowns work out-of-the-box
    from app.models.warehouse import Warehouse
    from app.models.customer import Customer
    from app.models.supplier import Supplier
    
    default_warehouse = Warehouse(name="Main Warehouse", organization_id=org.id)
    default_customer = Customer(name="Walk-in Customer", email="walkin@example.com", organization_id=org.id)
    default_supplier = Supplier(company_name="General Supplier", contact_name="Default", email="supplier@example.com", organization_id=org.id)
    
    db.add(default_warehouse)
    db.add(default_customer)
    db.add(default_supplier)
    
    await db.commit()
    await db.refresh(user)
    return user

@router.post("/login", response_model=Token)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = security.create_access_token(subject=str(user.id))
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: Annotated[User, Depends(get_current_active_user)]):
    return current_user
