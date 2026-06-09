from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.import_record import ImportRecord


async def create(
    db: AsyncSession,
    user_id: UUID,
    import_type: str,
    payload: dict | list,
    item_count: int,
) -> ImportRecord:
    record = ImportRecord(
        user_id=user_id,
        import_type=import_type,
        payload=payload,
        item_count=item_count,
        status="pending",
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return record


async def list_by_user(
    db: AsyncSession,
    user_id: UUID,
    limit: int = 20,
) -> list[ImportRecord]:
    result = await db.execute(
        select(ImportRecord)
        .where(ImportRecord.user_id == user_id)
        .order_by(ImportRecord.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())
