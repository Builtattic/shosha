from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.responses import success
from app.models.user import User
from app.schemas.common import SuccessEnvelope
from app.schemas.people import (
    DeckAccountOut,
    DeckResponse,
    SwipeRequest,
    SwipeResponse,
    TrendingAccountOut,
    TrendingResponse,
)
from app.services.people_service import get_deck, get_trending, record_swipe

router = APIRouter()


@router.get(
    "/trending",
    response_model=SuccessEnvelope[TrendingResponse],
    summary="Get trending people",
)
async def get_trending_route(
    db: AsyncSession = Depends(get_db),
):
    accounts = await get_trending(db)
    return success(
        {
            "items": [
                TrendingAccountOut.model_validate(a).model_dump(mode="json")
                for a in accounts
            ],
        }
    )


@router.get(
    "/deck",
    response_model=SuccessEnvelope[DeckResponse],
    summary="Get people swipe deck",
)
async def get_deck_route(
    cursor: int = Query(default=0, ge=0),
    limit: int = Query(default=8, ge=1, le=20),
    platform: str | None = Query(default=None),
    score_filter: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, next_cursor, has_more = await get_deck(
        db,
        current_user,
        cursor=cursor,
        limit=limit,
        platform=platform,
        score_filter=score_filter,
    )
    return success(
        {
            "items": [
                DeckAccountOut.model_validate(a).model_dump(mode="json") for a in items
            ],
            "next_cursor": next_cursor,
            "has_more": has_more,
        }
    )


@router.post(
    "/deck/{account_id}/swipe",
    response_model=SuccessEnvelope[SwipeResponse],
    summary="Record a swipe on a deck profile",
)
async def post_deck_swipe(
    account_id: UUID,
    body: SwipeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    record, new_score = await record_swipe(db, account_id, body.direction, current_user)
    return success(
        {
            "account_id": record.account_id,
            "direction": record.direction,
            "delta": record.delta,
            "new_account_score": new_score,
        }
    )
