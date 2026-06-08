from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import IssueReportStatus
from app.models.issue_report import IssueReport
from app.repositories._pagination import (
    apply_created_at_cursor,
    build_next_cursor,
    decode_cursor,
)

_OPEN_ISSUE_STATUSES = (IssueReportStatus.OPEN, IssueReportStatus.IN_PROGRESS)


async def create(db: AsyncSession, **kwargs) -> IssueReport:
    issue_report = IssueReport(**kwargs)
    db.add(issue_report)
    await db.flush()
    await db.refresh(issue_report)
    return issue_report


async def get_by_id(db: AsyncSession, issue_report_id: UUID) -> IssueReport | None:
    result = await db.execute(
        select(IssueReport).where(IssueReport.id == issue_report_id)
    )
    return result.scalar_one_or_none()


async def update(db: AsyncSession, obj: IssueReport, **kwargs) -> IssueReport:
    for key, value in kwargs.items():
        setattr(obj, key, value)
    await db.flush()
    await db.refresh(obj)
    return obj


async def list_open(
    db: AsyncSession,
    limit: int = 50,
    cursor: str | None = None,
) -> tuple[list[IssueReport], str | None]:
    stmt = select(IssueReport).where(IssueReport.status.in_(_OPEN_ISSUE_STATUSES))
    stmt = apply_created_at_cursor(
        stmt, IssueReport.created_at, decode_cursor(cursor), descending=True
    )
    stmt = stmt.order_by(
        IssueReport.created_at.desc(),
        IssueReport.id.desc(),
    ).limit(limit + 1)
    result = await db.execute(stmt)
    return build_next_cursor(list(result.scalars().all()), limit)


async def list_all(
    db: AsyncSession,
    limit: int = 50,
    cursor: str | None = None,
) -> tuple[list[IssueReport], str | None]:
    stmt = apply_created_at_cursor(
        select(IssueReport),
        IssueReport.created_at,
        decode_cursor(cursor),
        descending=True,
    )
    stmt = stmt.order_by(
        IssueReport.created_at.desc(),
        IssueReport.id.desc(),
    ).limit(limit + 1)
    result = await db.execute(stmt)
    return build_next_cursor(list(result.scalars().all()), limit)
