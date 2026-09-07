from pydantic import BaseModel
from typing import List
from uuid import UUID
from datetime import date
from decimal import Decimal

class DemandForecastResponse(BaseModel):
    product_id: UUID
    predicted_depletion_date: date | None
    days_remaining: int | None
    confidence_score: float # 0.0 to 1.0
    reasoning: str

class POSuggestionItem(BaseModel):
    product_id: UUID
    suggested_quantity: int
    unit_cost: Decimal
    reasoning: str

class POSuggestion(BaseModel):
    supplier_id: UUID
    expected_delivery: date
    items: List[POSuggestionItem]
    
class POSuggestionsResponse(BaseModel):
    suggestions: List[POSuggestion]
    message: str | None = None
