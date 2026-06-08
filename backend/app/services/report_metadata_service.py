from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.report_metadata import ReportMetadata
from app.repositories import report_metadata_repository as repo


async def upsert_metadata(
    db: AsyncSession,
    report_id: UUID,
    account_id: UUID,
    **kwargs,
) -> ReportMetadata:
    metadata = await repo.upsert_for_report(db, report_id, account_id, **kwargs)
    await db.commit()
    await db.refresh(metadata)
    return metadata


async def get_by_report(db: AsyncSession, report_id: UUID) -> ReportMetadata | None:
    return await repo.get_by_report_id(db, report_id)
