from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.models.product import Product
from app.models.alert import Alert

async def check_and_create_low_stock_alert(db: AsyncSession, product_id: UUID, org_id: UUID):
    """
    Checks if a product's current stock has fallen below its reorder point.
    If so, and an UNREAD alert doesn't already exist, it creates one.
    """
    prod_result = await db.execute(select(Product).where(Product.id == product_id))
    product = prod_result.scalar_one_or_none()
    
    if not product:
        return
        
    if product.current_stock <= product.reorder_point:
        # Check if an unread alert already exists for this product
        alert_result = await db.execute(select(Alert).where(
            Alert.product_id == product_id,
            Alert.status == "UNREAD",
            Alert.type == "LOW_STOCK"
        ))
        existing_alert = alert_result.scalar_one_or_none()
        
        if not existing_alert:
            alert = Alert(
                organization_id=org_id,
                product_id=product_id,
                type="LOW_STOCK",
                message=f"Product '{product.name}' (SKU: {product.sku}) is running low on stock. Current stock: {product.current_stock}, Reorder point: {product.reorder_point}."
            )
            db.add(alert)
