from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user_optional
from app.core.exceptions import raise_api_error
from app.core.responses import success
from app.models.user import User
from app.repositories.report_repository import fetch_feed_aggregates
from app.schemas.common import SuccessEnvelope
from app.schemas.report import FeedListData, FeedReportOut
from app.services import get_feed

router = APIRouter()

FeedFilterParam = Literal["all", "following", "near", "top"]


@router.get(
    "",
    response_model=SuccessEnvelope[FeedListData],
    summary="Get public feed",
)
async def get_feed_route(
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = Query(default=None),
    platform: str | None = Query(default=None),
    filter: FeedFilterParam = Query(default="all"),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    if filter in ("following", "near") and current_user is None:
        raise_api_error("unauthorized", "Authentication required for this feed filter")

    items, next_cursor, empty_reason = await get_feed(
        db,
        limit,
        cursor,
        platform,
        feed_filter=filter,
        current_user=current_user,
    )

    report_ids = [report.id for report in items]
    aggregates = await fetch_feed_aggregates(
        db,
        report_ids,
        current_user.id if current_user is not None else None,
    )

    serialized: list[dict] = []
    for report in items:
        agg = aggregates.get(report.id, {})
        payload = FeedReportOut.model_validate(report)
        payload.align_count = agg.get("align_count", 0)
        payload.oppose_count = agg.get("oppose_count", 0)
        payload.comment_count = agg.get("comment_count", 0)
        payload.viewer_vote = agg.get("viewer_vote")
        serialized.append(payload.model_dump(mode="json"))

    return success(
        {
            "items": serialized,
            "next_cursor": next_cursor,
            "empty_reason": empty_reason,
        }
    )
