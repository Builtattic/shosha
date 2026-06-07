from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import raise_api_error
from app.models.account import Account
from app.models.enums import SwipeDirection
from app.models.swipe_record import SwipeRecord
from app.models.user import User
from app.repositories import (
    get_account_by_id,
    list_swipes_for_user,
    list_top_accounts,
    list_trending_accounts,
    upsert_swipe,
)
from app.services.scoring_service import BASE_SCORE

SWIPE_COOLDOWN_DAYS = 7
SWIPE_DELTA = 5.0


async def get_trending(
    db: AsyncSession,
    limit: int = 10,
) -> list[Account]:
    accounts = await list_trending_accounts(db, limit)
    if len(accounts) < 3:
        accounts = await list_top_accounts(db, limit=10)
    return accounts


async def get_deck(
    db: AsyncSession,
    current_user: User,
    cursor: int = 0,
    limit: int = 8,
    platform: str | None = None,
    region: str | None = None,
    score_filter: str | None = None,
) -> tuple[list[Account], int, bool]:
    del region  # V2 Account has no region field

    eligible = await list_top_accounts(db, limit=60)

    since = datetime.now(timezone.utc) - timedelta(days=SWIPE_COOLDOWN_DAYS)
    swipes = await list_swipes_for_user(db, current_user.id, since=since)
    recently_swiped_ids = {s.account_id for s in swipes}

    filtered = [a for a in eligible if a.id not in recently_swiped_ids]

    if platform is not None:
        filtered = [a for a in filtered if a.platform == platform]

    if score_filter == "trending":
        filtered = [a for a in filtered if a.score > BASE_SCORE]
    elif score_filter == "underfire":
        filtered = [a for a in filtered if a.score < BASE_SCORE]
    elif score_filter == "elite":
        filtered = [a for a in filtered if a.score >= 1100.0]

    items = filtered[cursor : cursor + limit]
    next_cursor = cursor + limit
    has_more = len(items) == limit
    return items, next_cursor, has_more


async def record_swipe(
    db: AsyncSession,
    account_id: UUID,
    direction: SwipeDirection,
    current_user: User,
) -> tuple[SwipeRecord, float]:
    account = await get_account_by_id(db, account_id)
    if account is None:
        raise_api_error("not_found", "Account not found")

    delta = SWIPE_DELTA if direction == SwipeDirection.ALIGN else -SWIPE_DELTA
    record = await upsert_swipe(
        db,
        current_user.id,
        account_id,
        direction,
        delta,
    )
    account.score += delta
    await db.commit()
    await db.refresh(record)
    await db.refresh(account)
    return record, account.score
