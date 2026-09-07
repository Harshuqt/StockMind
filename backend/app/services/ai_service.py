import json
import google.generativeai as genai
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from datetime import datetime, timedelta, date

from app.core.config import settings
from app.models.product import Product
from app.models.inventory_transaction import InventoryTransaction
from app.models.supplier import Supplier
from app.schemas.ai import DemandForecastResponse, POSuggestionsResponse

# Initialize Gemini if key exists
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

async def generate_demand_forecast(db: AsyncSession, product_id: UUID, org_id: UUID) -> DemandForecastResponse:
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured")

    # Fetch product
    prod_result = await db.execute(select(Product).where(Product.id == product_id, Product.organization_id == org_id))
    product = prod_result.scalar_one_or_none()
    
    if not product:
        raise ValueError("Product not found")

    # Fetch last 90 days of STOCK_OUT transactions for this product
    ninety_days_ago = datetime.utcnow() - timedelta(days=90)
    tx_result = await db.execute(
        select(InventoryTransaction)
        .where(
            InventoryTransaction.product_id == product_id,
            InventoryTransaction.transaction_type == 'STOCK_OUT',
            InventoryTransaction.created_at >= ninety_days_ago
        )
        .order_by(InventoryTransaction.created_at.desc())
    )
    transactions = tx_result.scalars().all()
    
    # Aggregate sales by day for the prompt
    daily_sales = {}
    for tx in transactions:
        day_str = tx.created_at.strftime('%Y-%m-%d')
        # quantity_changed is negative for STOCK_OUT, so we use absolute value
        daily_sales[day_str] = daily_sales.get(day_str, 0) + abs(tx.quantity_changed)
    
    # Prepare the prompt
    prompt = f"""
You are an expert AI supply chain analyst.
Product Name: {product.name}
Current Stock: {product.current_stock}
Historical Sales (Last 90 Days): {json.dumps(daily_sales)}

Analyze the historical sales velocity and predict when the current stock will be completely depleted.

Respond STRICTLY in JSON format with no markdown formatting or extra text. Use this exact schema:
{{
  "predicted_depletion_date": "YYYY-MM-DD",
  "days_remaining": integer,
  "confidence_score": float (0.0 to 1.0),
  "reasoning": "string explaining your calculation"
}}
"""

    model = genai.GenerativeModel('gemini-3.6-flash')
    response = model.generate_content(prompt)
    
    # Parse JSON
    try:
        response_text = response.text
        # Strip markdown if Gemini accidentally includes it
        if response_text.startswith("```json"):
            response_text = response_text[7:-3]
        elif response_text.startswith("```"):
            response_text = response_text[3:-3]
            
        data = json.loads(response_text)
        
        # Parse date safely
        pred_date = None
        if data.get("predicted_depletion_date"):
            try:
                pred_date = date.fromisoformat(data["predicted_depletion_date"])
            except:
                pass
                
        return DemandForecastResponse(
            product_id=product_id,
            predicted_depletion_date=pred_date,
            days_remaining=data.get("days_remaining"),
            confidence_score=data.get("confidence_score", 0.5),
            reasoning=data.get("reasoning", "No reasoning provided.")
        )
    except Exception as e:
        raise ValueError(f"Failed to parse AI response: {str(e)}")

async def generate_po_suggestions(db: AsyncSession, org_id: UUID) -> POSuggestionsResponse:
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured")

    # Fetch products that are low stock
    prod_result = await db.execute(
        select(Product)
        .where(Product.organization_id == org_id)
        .where(Product.current_stock <= Product.reorder_point)
    )
    products = prod_result.scalars().all()
    
    if not products:
        prompt = """
You are an expert AI supply chain manager.
Our inventory is completely healthy. All products are well above their reorder points.
Generate a brief, reassuring 1-2 sentence message telling the user their inventory is healthy and offering a general tip about inventory management or demand forecasting.
Respond STRICTLY in JSON format with no markdown formatting or extra text. Use this exact schema:
{
  "suggestions": [],
  "message": "your reassuring message here"
}
"""
        model = genai.GenerativeModel('gemini-3.6-flash')
        response = model.generate_content(prompt)
        try:
            response_text = response.text
            if response_text.startswith("```json"): response_text = response_text[7:-3]
            elif response_text.startswith("```"): response_text = response_text[3:-3]
            data = json.loads(response_text)
            return POSuggestionsResponse(**data)
        except Exception:
            return POSuggestionsResponse(suggestions=[], message="Your inventory is healthy! No urgent reorders needed.")
        
    # We will just prompt the AI with the low stock products and ask it to group them by dummy supplier or real supplier if we had it mapped
    # In a real scenario, Product might have a `preferred_supplier_id`. Since it doesn't in our schema, 
    # we will fetch all suppliers and let the AI assign them or just use a default logic.
    # Let's fetch suppliers
    sup_result = await db.execute(select(Supplier).where(Supplier.organization_id == org_id))
    suppliers = sup_result.scalars().all()
    
    if not suppliers:
        raise ValueError("No suppliers exist to create POs for.")
        
    product_data = [{"id": str(p.id), "name": p.name, "current_stock": p.current_stock, "reorder_point": p.reorder_point, "cost_price": float(p.cost_price or 0)} for p in products]
    supplier_data = [{"id": str(s.id), "name": s.company_name} for s in suppliers]

    prompt = f"""
You are an expert AI supply chain manager.
We have the following products that are at or below their reorder points:
{json.dumps(product_data)}

We have the following available suppliers:
{json.dumps(supplier_data)}

Distribute the low-stock products to suppliers logically (or group them into a single supplier if only one makes sense). 
Suggest an order quantity that brings the stock well above the reorder point (e.g., 2x or 3x the reorder point).

Respond STRICTLY in JSON format with no markdown formatting or extra text. Use this exact schema:
{{
  "suggestions": [
    {{
      "supplier_id": "UUID",
      "expected_delivery": "YYYY-MM-DD",
      "items": [
        {{
          "product_id": "UUID",
          "suggested_quantity": integer,
          "unit_cost": float,
          "reasoning": "string"
        }}
      ]
    }}
  ]
}}
"""

    model = genai.GenerativeModel('gemini-3.6-flash')
    response = model.generate_content(prompt)
    
    try:
        response_text = response.text
        if response_text.startswith("```json"):
            response_text = response_text[7:-3]
        elif response_text.startswith("```"):
            response_text = response_text[3:-3]
            
        data = json.loads(response_text)
        return POSuggestionsResponse(**data)
    except Exception as e:
        raise ValueError(f"Failed to parse AI response: {str(e)}")
