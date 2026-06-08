from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import SubscriptionTier
from app.models.subscription import Subscription
from app.repositories import subscription_repository as repo

FREE_DAILY_LIMIT = 5
PRO_DAILY_LIMIT = 50


def _daily_limit(tier: SubscriptionTier) -> int:
    return PRO_DAILY_LIMIT if tier == SubscriptionTier.PRO else FREE_DAILY_LIMIT


def _needs_reset(reset_at: datetime | None) -> bool:
    if reset_at is None:
        return True
    now = datetime.now(timezone.utc)
    return reset_at.astimezone(timezone.utc).date() != now.date()


async def get_or_create(db: AsyncSession, user_id: UUID) -> Subscription:
    subscription = await repo.get_by_user_id(db, user_id)
    if subscription is not None:
        return subscription
    subscription = await repo.upsert_for_user(
        db,
        user_id,
        tier=SubscriptionTier.FREE,
        daily_reports_used=0,
        daily_reports_reset_at=datetime.now(timezone.utc),
    )
    await db.commit()
    await db.refresh(subscription)
    return subscription


async def can_report(db: AsyncSession, user_id: UUID) -> bool:
    subscription = await get_or_create(db, user_id)
    limit = _daily_limit(subscription.tier)
    if _needs_reset(subscription.daily_reports_reset_at):
        await repo.update_usage(
            db,
            subscription,
            daily_reports_used=0,
            daily_reports_reset_at=datetime.now(timezone.utc),
        )
        await db.commit()
        return True
    return subscription.daily_reports_used < limit


async def can_dispute(db: AsyncSession, user_id: UUID) -> bool:
    subscription = await get_or_create(db, user_id)
    return subscription.tier == SubscriptionTier.PRO


async def increment_daily_report(db: AsyncSession, user_id: UUID) -> Subscription:
    subscription = await get_or_create(db, user_id)
    if _needs_reset(subscription.daily_reports_reset_at):
        updated = await repo.update_usage(
            db,
            subscription,
            daily_reports_used=1,
            daily_reports_reset_at=datetime.now(timezone.utc),
        )
    else:
        updated = await repo.update_usage(
            db,
            subscription,
            daily_reports_used=subscription.daily_reports_used + 1,
            daily_reports_reset_at=subscription.daily_reports_reset_at,
        )
    await db.commit()
    await db.refresh(updated)
    return updated
