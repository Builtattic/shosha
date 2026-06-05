from __future__ import annotations

import base64
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import NotificationType
from app.models.notification import Notification


def _encode_cursor(is_read: bool, created_at: datetime, notification_id: UUID) -> str:
    payload = f"{int(is_read)}:{created_at.isoformat()}:{notification_id}"
    return base64.urlsafe_b64encode(payload.encode()).decode()


def _decode_cursor(cursor: str | None) -> tuple[bool, datetime, UUID] | None:
    if not cursor:
        return None
    try:
        raw = base64.urlsafe_b64decode(cursor.encode()).decode()
        is_read_str, created_at_str, notification_id_str = raw.split(":", 2)
        return (
            bool(int(is_read_str)),
            datetime.fromisoformat(created_at_str),
            UUID(notification_id_str),
        )
    except (ValueError, OSError):
        return None


def _apply_notification_cursor(
    stmt,
    cursor_data: tuple[bool, datetime, UUID] | None,
):
    if cursor_data is None:
        return stmt
    cursor_is_read, cursor_created_at, cursor_id = cursor_data
    return stmt.where(
        or_(
            Notification.is_read > cursor_is_read,
            (Notification.is_read == cursor_is_read)
            & (Notification.created_at < cursor_created_at),
            (Notification.is_read == cursor_is_read)
            & (Notification.created_at == cursor_created_at)
            & (Notification.id < cursor_id),
        )
    )


async def list_for_user(
    db: AsyncSession,
    user_id: UUID,
    limit: int = 50,
    cursor: str | None = None,
) -> tuple[list[Notification], str | None]:
    stmt = (
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(
            Notification.is_read.asc(),
            Notification.created_at.desc(),
            Notification.id.desc(),
        )
    )
    stmt = _apply_notification_cursor(stmt, _decode_cursor(cursor))
    stmt = stmt.limit(limit + 1)
    result = await db.execute(stmt)
    items = list(result.scalars().all())
    if len(items) > limit:
        page = items[:limit]
        last = page[-1]
        return page, _encode_cursor(last.is_read, last.created_at, last.id)
    return items, None


async def get_by_id(
    db: AsyncSession,
    notification_id: UUID,
    user_id: UUID,
) -> Notification | None:
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def create(
    db: AsyncSession,
    user_id: UUID,
    notification_type: NotificationType,
    title: str,
    message: str,
    metadata_json: dict | None = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        message=message,
        metadata_json=metadata_json,
    )
    db.add(notification)
    await db.flush()
    await db.refresh(notification)
    return notification


async def mark_read(
    db: AsyncSession,
    notification_id: UUID,
    user_id: UUID,
) -> Notification | None:
    notification = await get_by_id(db, notification_id, user_id)
    if notification is None:
        return None
    notification.is_read = True
    notification.read_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(notification)
    return notification


async def mark_all_read(db: AsyncSession, user_id: UUID) -> int:
    now = datetime.now(timezone.utc)
    result = await db.execute(
        update(Notification)
        .where(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
        .values(is_read=True, read_at=now)
    )
    await db.flush()
    return result.rowcount


async def count_unread(db: AsyncSession, user_id: UUID) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(Notification)
        .where(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
    )
    return result.scalar_one()
