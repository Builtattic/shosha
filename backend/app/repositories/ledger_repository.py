from __future__ import annotations

from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ledger_entry import LedgerEntry


async def get_by_report_id(db: AsyncSession, report_id: UUID) -> LedgerEntry | None:
    result = await db.execute(
        select(LedgerEntry).where(LedgerEntry.report_id == report_id).limit(1)
    )
    return result.scalar_one_or_none()


async def list_for_account(
    db: AsyncSession,
    account_id: UUID,
    limit: int = 1000,
) -> list[LedgerEntry]:
    result = await db.execute(
        select(LedgerEntry)
        .where(LedgerEntry.account_id == account_id)
        .order_by(LedgerEntry.timestamp.asc(), LedgerEntry.id.asc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def create(db: AsyncSession, **fields: object) -> LedgerEntry:
    entry = LedgerEntry(**fields)
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    return entry


async def delete_by_report_id(db: AsyncSession, report_id: UUID) -> bool:
    result = await db.execute(
        delete(LedgerEntry).where(LedgerEntry.report_id == report_id)
    )
    return (result.rowcount or 0) > 0
