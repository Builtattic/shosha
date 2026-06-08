from __future__ import annotations

from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.report_bookmark import ReportBookmark
from app.repositories._pagination import (
    apply_created_at_cursor,
    build_next_cursor,
    decode_cursor,
)


async def create(db: AsyncSession, user_id: UUID, report_id: UUID) -> ReportBookmark:
    bookmark = ReportBookmark(user_id=user_id, report_id=report_id)
    db.add(bookmark)
    await db.flush()
    await db.refresh(bookmark)
    return bookmark


async def get_by_user_and_report(
    db: AsyncSession,
    user_id: UUID,
    report_id: UUID,
) -> ReportBookmark | None:
    result = await db.execute(
        select(ReportBookmark).where(
            ReportBookmark.user_id == user_id,
            ReportBookmark.report_id == report_id,
        )
    )
    return result.scalar_one_or_none()


async def delete_by_user_and_report(
    db: AsyncSession,
    user_id: UUID,
    report_id: UUID,
) -> bool:
    result = await db.execute(
        delete(ReportBookmark).where(
            ReportBookmark.user_id == user_id,
            ReportBookmark.report_id == report_id,
        )
    )
    await db.flush()
    return result.rowcount > 0


async def list_by_user(
    db: AsyncSession,
    user_id: UUID,
    limit: int = 50,
    cursor: str | None = None,
) -> tuple[list[ReportBookmark], str | None]:
    stmt = select(ReportBookmark).where(ReportBookmark.user_id == user_id)
    stmt = apply_created_at_cursor(
        stmt, ReportBookmark.created_at, decode_cursor(cursor), descending=True
    )
    stmt = stmt.order_by(
        ReportBookmark.created_at.desc(),
        ReportBookmark.id.desc(),
    ).limit(limit + 1)
    result = await db.execute(stmt)
    return build_next_cursor(list(result.scalars().all()), limit)
