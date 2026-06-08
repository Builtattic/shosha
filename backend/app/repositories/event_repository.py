from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import ReportStatus
from app.models.event import Event
from app.repositories._pagination import (
    apply_created_at_cursor,
    build_next_cursor,
    decode_cursor,
)


async def create(db: AsyncSession, **kwargs) -> Event:
    event = Event(**kwargs)
    db.add(event)
    await db.flush()
    await db.refresh(event)
    return event


async def get_by_id(db: AsyncSession, event_id: UUID) -> Event | None:
    result = await db.execute(select(Event).where(Event.id == event_id))
    return result.scalar_one_or_none()


async def update(db: AsyncSession, obj: Event, **kwargs) -> Event:
    for key, value in kwargs.items():
        setattr(obj, key, value)
    await db.flush()
    await db.refresh(obj)
    return obj


async def delete_by_id(db: AsyncSession, event_id: UUID) -> bool:
    result = await db.execute(delete(Event).where(Event.id == event_id))
    await db.flush()
    return result.rowcount > 0


async def list_for_account(
    db: AsyncSession,
    account_id: UUID,
    limit: int = 50,
    cursor: str | None = None,
) -> tuple[list[Event], str | None]:
    stmt = select(Event).where(Event.subject_account_id == account_id)
    stmt = apply_created_at_cursor(
        stmt, Event.created_at, decode_cursor(cursor), descending=True
    )
    stmt = stmt.order_by(Event.created_at.desc(), Event.id.desc()).limit(limit + 1)
    result = await db.execute(stmt)
    return build_next_cursor(list(result.scalars().all()), limit)


async def list_by_reporter(
    db: AsyncSession,
    reporter_user_id: UUID,
    limit: int = 50,
    cursor: str | None = None,
) -> tuple[list[Event], str | None]:
    stmt = select(Event).where(Event.reporter_user_id == reporter_user_id)
    stmt = apply_created_at_cursor(
        stmt, Event.created_at, decode_cursor(cursor), descending=True
    )
    stmt = stmt.order_by(Event.created_at.desc(), Event.id.desc()).limit(limit + 1)
    result = await db.execute(stmt)
    return build_next_cursor(list(result.scalars().all()), limit)


async def list_pending(
    db: AsyncSession,
    limit: int = 50,
    cursor: str | None = None,
) -> tuple[list[Event], str | None]:
    stmt = select(Event).where(Event.status == ReportStatus.PENDING)
    stmt = apply_created_at_cursor(
        stmt, Event.created_at, decode_cursor(cursor), descending=True
    )
    stmt = stmt.order_by(Event.created_at.desc(), Event.id.desc()).limit(limit + 1)
    result = await db.execute(stmt)
    return build_next_cursor(list(result.scalars().all()), limit)


async def list_public_feed(
    db: AsyncSession,
    limit: int = 50,
    cursor: str | None = None,
) -> tuple[list[Event], str | None]:
    stmt = select(Event).where(Event.status == ReportStatus.APPROVED)
    stmt = apply_created_at_cursor(
        stmt, Event.created_at, decode_cursor(cursor), descending=True
    )
    stmt = stmt.order_by(Event.created_at.desc(), Event.id.desc()).limit(limit + 1)
    result = await db.execute(stmt)
    return build_next_cursor(list(result.scalars().all()), limit)


async def find_duplicate(
    db: AsyncSession,
    account_id: UUID,
    description: str,
    within_hours: int = 24,
) -> Event | None:
    since = datetime.now(timezone.utc) - timedelta(hours=within_hours)
    normalized = description.strip().lower()
    result = await db.execute(
        select(Event).where(
            Event.subject_account_id == account_id,
            Event.created_at >= since,
            func.lower(func.trim(Event.description)) == normalized,
        )
    )
    return result.scalars().first()


async def count(db: AsyncSession, account_id: UUID) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(Event)
        .where(Event.subject_account_id == account_id)
    )
    return result.scalar_one()


async def count_since(db: AsyncSession, account_id: UUID, since: datetime) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(Event)
        .where(
            Event.subject_account_id == account_id,
            Event.created_at >= since,
        )
    )
    return result.scalar_one()
