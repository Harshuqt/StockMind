from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, desc, asc
from typing import Annotated, Optional
from uuid import UUID

from app.db.session import get_db
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate
from app.api.deps import get_current_organization_id, get_current_active_user

router = APIRouter()

@router.post("/", response_model=ProductResponse)
async def create_product(
    product_in: ProductCreate,
    org_id: Annotated[UUID, Depends(get_current_organization_id)],
    current_user: Annotated[dict, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    product = Product(**product_in.model_dump(), organization_id=org_id)
    db.add(product)
    try:
        await db.commit()
        await db.refresh(product)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Error creating product. SKU might already exist.")
    return product

@router.get("/", response_model=list[ProductResponse])
async def read_products(
    org_id: Annotated[UUID, Depends(get_current_organization_id)],
    current_user: Annotated[dict, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
    search: Optional[str] = None,
    category_id: Optional[UUID] = None,
    status: Optional[str] = None,
    sort_by: Optional[str] = Query("created_at", description="Sort field: name, sku, current_stock, selling_price, created_at, updated_at"),
    sort_desc: bool = True,
    skip: int = 0,
    limit: int = 100
):
    stmt = select(Product).where(Product.organization_id == org_id)
    
    # Filtering
    if search:
        search_filter = f"%{search}%"
        stmt = stmt.where(
            or_(
                Product.name.ilike(search_filter),
                Product.sku.ilike(search_filter),
                Product.barcode.ilike(search_filter)
            )
        )
    if category_id:
        stmt = stmt.where(Product.category_id == category_id)
    if status:
        stmt = stmt.where(Product.status == status)
    else:
        # Default to excluding archived unless specified
        stmt = stmt.where(Product.status != "Archived")
        
    # Sorting
    order_col = getattr(Product, sort_by, Product.created_at)
    if sort_desc:
        stmt = stmt.order_by(desc(order_col))
    else:
        stmt = stmt.order_by(asc(order_col))
        
    # Pagination
    stmt = stmt.offset(skip).limit(limit)

    result = await db.execute(stmt)
    return result.scalars().all()

@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    product_in: ProductUpdate,
    org_id: Annotated[UUID, Depends(get_current_organization_id)],
    current_user: Annotated[dict, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Product).where(Product.id == product_id, Product.organization_id == org_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    update_data = product_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)
        
    try:
        await db.commit()
        await db.refresh(product)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Error updating product. SKU might already exist.")
    return product

@router.delete("/{product_id}")
async def archive_product(
    product_id: UUID,
    org_id: Annotated[UUID, Depends(get_current_organization_id)],
    current_user: Annotated[dict, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Product).where(Product.id == product_id, Product.organization_id == org_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    product.status = "Archived"
    await db.commit()
    return {"message": "Product archived successfully"}
