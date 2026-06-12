from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cron_auth import verify_cron_token
from app.core.database import get_db
from app.core.responses import success
from app.schemas.common import SuccessEnvelope
from app.services import cron_service

router = APIRouter()


@router.post(
    "/weekly-momentum",
    response_model=SuccessEnvelope[dict],
    summary="Run weekly momentum cron",
)
async def post_weekly_momentum(
    _: None = Depends(verify_cron_token),
    db: AsyncSession = Depends(get_db),
):
    result = await cron_service.run_weekly_momentum(db)
    return success(result)


@router.get(
    "/weekly-momentum",
    response_model=SuccessEnvelope[dict],
    summary="Get weekly momentum cron status",
)
async def get_weekly_momentum(
    _: None = Depends(verify_cron_token),
    db: AsyncSession = Depends(get_db),
):
    result = await cron_service.get_weekly_momentum_status(db)
    return success(result)
