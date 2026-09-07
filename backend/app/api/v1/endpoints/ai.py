from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated
from uuid import UUID

from app.db.session import get_db
from app.api.deps import get_current_organization_id, get_current_active_user
from app.schemas.ai import DemandForecastResponse, POSuggestionsResponse
from app.services.ai_service import generate_demand_forecast, generate_po_suggestions

router = APIRouter()

@router.get("/forecast/{product_id}", response_model=DemandForecastResponse)
async def get_demand_forecast(
    product_id: UUID,
    org_id: Annotated[UUID, Depends(get_current_organization_id)],
    current_user: Annotated[dict, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    try:
        return await generate_demand_forecast(db, product_id, org_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error calling AI service")

@router.get("/suggestions/purchase-orders", response_model=POSuggestionsResponse)
async def get_po_suggestions(
    org_id: Annotated[UUID, Depends(get_current_organization_id)],
    current_user: Annotated[dict, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    try:
        return await generate_po_suggestions(db, org_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error calling AI service")
