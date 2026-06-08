from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.report_metadata import ReportMetadata


async def get_by_report_id(db: AsyncSession, report_id: UUID) -> ReportMetadata | None:
    result = await db.execute(
        select(ReportMetadata).where(ReportMetadata.report_id == report_id)
    )
    return result.scalar_one_or_none()


async def upsert_for_report(
    db: AsyncSession,
    report_id: UUID,
    account_id: UUID,
    **kwargs,
) -> ReportMetadata:
    values = {"report_id": report_id, "account_id": account_id, **kwargs}
    update_set = {"account_id": account_id, **kwargs}
    stmt = (
        insert(ReportMetadata)
        .values(**values)
        .on_conflict_do_update(
            index_elements=[ReportMetadata.report_id],
            set_=update_set,
        )
    )
    await db.execute(stmt)
    await db.flush()
    metadata = await get_by_report_id(db, report_id)
    assert metadata is not None
    await db.refresh(metadata)
    return metadata
