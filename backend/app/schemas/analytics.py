from pydantic import BaseModel
from decimal import Decimal

class DashboardAnalyticsResponse(BaseModel):
    total_products: int
    total_inventory_value: Decimal
    low_stock_count: int
    out_of_stock_count: int
    todays_orders: int
    todays_revenue: Decimal
    pending_purchase_orders: int
