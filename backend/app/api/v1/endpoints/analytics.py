from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Annotated
from uuid import UUID
from datetime import datetime, date

from app.db.session import get_db
from app.models.product import Product
from app.models.sales_order import SalesOrder
from app.models.purchase_order import PurchaseOrder
from app.schemas.analytics import DashboardAnalyticsResponse
from app.api.deps import get_current_organization_id, get_current_active_user

router = APIRouter()

@router.get("/dashboard", response_model=DashboardAnalyticsResponse)
async def get_dashboard_analytics(
    org_id: Annotated[UUID, Depends(get_current_organization_id)],
    current_user: Annotated[dict, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    # 1. Total Products
    prod_count_result = await db.execute(select(func.count(Product.id)).where(Product.organization_id == org_id))
    total_products = prod_count_result.scalar_one()
    
    # 2. Total Inventory Value & Low/Out of Stock count
    prods_result = await db.execute(select(Product).where(Product.organization_id == org_id))
    products = prods_result.scalars().all()
    
    total_inventory_value = sum((p.current_stock * (p.cost_price or 0)) for p in products)
    out_of_stock_count = sum(1 for p in products if p.current_stock <= 0)
    low_stock_count = sum(1 for p in products if p.current_stock > 0 and p.current_stock <= p.reorder_point)
    
    # 3. Today's Orders & Revenue
    today = date.today()
    orders_result = await db.execute(
        select(SalesOrder)
        .where(SalesOrder.organization_id == org_id)
        .where(func.date(SalesOrder.created_at) == today)
    )
    todays_orders_list = orders_result.scalars().all()
    todays_orders = len(todays_orders_list)
    todays_revenue = sum(o.total_amount for o in todays_orders_list)
    
    # 4. Pending Purchase Orders
    po_result = await db.execute(
        select(func.count(PurchaseOrder.id))
        .where(PurchaseOrder.organization_id == org_id)
        .where(PurchaseOrder.status.in_(["Draft", "Submitted", "Approved", "Ordered", "Partially Received"]))
    )
    pending_purchase_orders = po_result.scalar_one()
    
    return DashboardAnalyticsResponse(
        total_products=total_products,
        total_inventory_value=total_inventory_value,
        low_stock_count=low_stock_count,
        out_of_stock_count=out_of_stock_count,
        todays_orders=todays_orders,
        todays_revenue=todays_revenue,
        pending_purchase_orders=pending_purchase_orders
    )
