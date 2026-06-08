from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import raise_api_error
from app.models.enums import IssueReportStatus
from app.models.issue_report import IssueReport
from app.repositories import issue_report_repository as repo


async def create_issue_report(
    db: AsyncSession,
    submitted_by: UUID | None = None,
    **kwargs,
) -> IssueReport:
    issue_report = await repo.create(
        db,
        submitted_by=submitted_by,
        status=IssueReportStatus.OPEN,
        **kwargs,
    )
    await db.commit()
    await db.refresh(issue_report)
    return issue_report


async def list_open(
    db: AsyncSession,
    limit: int,
    cursor: str | None,
) -> tuple[list[IssueReport], str | None]:
    return await repo.list_open(db, limit, cursor)


async def list_all(
    db: AsyncSession,
    limit: int,
    cursor: str | None,
) -> tuple[list[IssueReport], str | None]:
    return await repo.list_all(db, limit, cursor)


async def update_status(
    db: AsyncSession,
    issue_report_id: UUID,
    reviewer_id: UUID,
    status: IssueReportStatus,
) -> IssueReport:
    issue_report = await repo.get_by_id(db, issue_report_id)
    if issue_report is None:
        raise_api_error("not_found", "Issue report not found")

    updated = await repo.update(db, issue_report, status=status)
    await db.commit()
    await db.refresh(updated)
    return updated
