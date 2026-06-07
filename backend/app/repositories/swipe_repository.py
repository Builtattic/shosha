from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import SwipeDirection
from app.models.swipe_record import SwipeRecord


async def get_by_user_and_account(
    db: AsyncSession,
    user_id: UUID,
    account_id: UUID,
) -> SwipeRecord | None:
    result = await db.execute(
        select(SwipeRecord).where(
            SwipeRecord.user_id == user_id,
            SwipeRecord.account_id == account_id,
        )
    )
    return result.scalar_one_or_none()


async def list_for_user(
    db: AsyncSession,
    user_id: UUID,
    since: datetime | None = None,
) -> list[SwipeRecord]:
    stmt = select(SwipeRecord).where(SwipeRecord.user_id == user_id)
    if since is not None:
        stmt = stmt.where(SwipeRecord.created_at >= since)
    stmt = stmt.order_by(SwipeRecord.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def upsert_swipe(
    db: AsyncSession,
    user_id: UUID,
    account_id: UUID,
    direction: SwipeDirection,
    delta: float,
) -> SwipeRecord:
    stmt = (
        insert(SwipeRecord)
        .values(
            user_id=user_id,
            account_id=account_id,
            direction=direction,
            delta=delta,
        )
        .on_conflict_do_update(
            constraint="uq_swipe_records_user_account",
            set_={
                "direction": direction,
                "delta": delta,
                "updated_at": func.now(),
            },
        )
        .returning(SwipeRecord)
    )
    result = await db.execute(stmt)
    record = result.scalar_one()
    await db.flush()
    await db.refresh(record)
    return record
