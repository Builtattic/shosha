from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.report_bookmark import ReportBookmark
from app.repositories import report_bookmark_repository as repo


async def toggle_bookmark(db: AsyncSession, user_id: UUID, report_id: UUID) -> dict:
    existing = await repo.get_by_user_and_report(db, user_id, report_id)
    if existing is not None:
        await repo.delete_by_user_and_report(db, user_id, report_id)
        await db.commit()
        return {"bookmarked": False}
    await repo.create(db, user_id, report_id)
    await db.commit()
    return {"bookmarked": True}


async def list_bookmarks(
    db: AsyncSession,
    user_id: UUID,
    limit: int,
    cursor: str | None,
) -> tuple[list[ReportBookmark], str | None]:
    return await repo.list_by_user(db, user_id, limit, cursor)
