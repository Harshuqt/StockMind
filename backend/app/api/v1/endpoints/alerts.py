from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Annotated
from uuid import UUID
from datetime import datetime

from app.db.session import get_db
from app.models.alert import Alert
from app.schemas.alert import AlertResponse
from app.api.deps import get_current_organization_id, get_current_active_user

router = APIRouter()

@router.get("/", response_model=list[AlertResponse])
async def read_alerts(
    org_id: Annotated[UUID, Depends(get_current_organization_id)],
    current_user: Annotated[dict, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
    status: str | None = None
):
    stmt = select(Alert).where(Alert.organization_id == org_id)
    if status:
        stmt = stmt.where(Alert.status == status)
    stmt = stmt.order_by(Alert.created_at.desc())
    
    result = await db.execute(stmt)
    return result.scalars().all()

@router.put("/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(
    alert_id: UUID,
    org_id: Annotated[UUID, Depends(get_current_organization_id)],
    current_user: Annotated[dict, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Alert).where(
        Alert.id == alert_id,
        Alert.organization_id == org_id
    ))
    alert = result.scalar_one_or_none()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    alert.status = "RESOLVED"
    alert.resolved_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(alert)
    return alert
