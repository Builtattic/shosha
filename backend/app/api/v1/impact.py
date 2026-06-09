from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.responses import success
from app.services import impact_service

router = APIRouter()


@router.get("/impact")
async def get_impact(
    db: AsyncSession = Depends(get_db),
):
    result = await impact_service.get_impact(db)
    return success(result)


@router.get("/impact/rising-makers")
async def get_rising_makers(
    db: AsyncSession = Depends(get_db),
):
    result = await impact_service.get_rising_makers(db)
    return success({"rising_makers": result})
