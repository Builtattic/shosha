from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import SubscriptionTier
from app.models.subscription import Subscription


async def get_by_user_id(db: AsyncSession, user_id: UUID) -> Subscription | None:
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def upsert_for_user(
    db: AsyncSession,
    user_id: UUID,
    tier: SubscriptionTier,
    daily_reports_used: int,
    daily_reports_reset_at: datetime | None,
) -> Subscription:
    stmt = (
        insert(Subscription)
        .values(
            user_id=user_id,
            tier=tier,
            daily_reports_used=daily_reports_used,
            daily_reports_reset_at=daily_reports_reset_at,
        )
        .on_conflict_do_update(
            index_elements=[Subscription.user_id],
            set_={
                "tier": tier,
                "daily_reports_used": daily_reports_used,
                "daily_reports_reset_at": daily_reports_reset_at,
            },
        )
    )
    await db.execute(stmt)
    await db.flush()
    subscription = await get_by_user_id(db, user_id)
    assert subscription is not None
    await db.refresh(subscription)
    return subscription


async def update_usage(
    db: AsyncSession,
    obj: Subscription,
    daily_reports_used: int,
    daily_reports_reset_at: datetime | None,
) -> Subscription:
    obj.daily_reports_used = daily_reports_used
    obj.daily_reports_reset_at = daily_reports_reset_at
    await db.flush()
    await db.refresh(obj)
    return obj
