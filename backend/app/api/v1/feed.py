from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.responses import success
from app.schemas.common import PaginatedResponse, SuccessEnvelope
from app.schemas.report import ReportOut
from app.services import get_feed

router = APIRouter()


@router.get(
    "",
    response_model=SuccessEnvelope[PaginatedResponse[ReportOut]],
    summary="Get public feed",
)
async def get_feed_route(
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = Query(default=None),
    platform: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    items, next_cursor = await get_feed(db, limit, cursor, platform)
    return success(
        {
            "items": [
                ReportOut.model_validate(r).model_dump(mode="json") for r in items
            ],
            "next_cursor": next_cursor,
        }
    )
