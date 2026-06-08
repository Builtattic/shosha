from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.site_setting import SiteSetting


async def get_by_key(db: AsyncSession, key: str) -> SiteSetting | None:
    result = await db.execute(select(SiteSetting).where(SiteSetting.key == key))
    return result.scalar_one_or_none()


async def upsert_by_key(db: AsyncSession, key: str, value: dict) -> SiteSetting:
    stmt = (
        insert(SiteSetting)
        .values(key=key, value=value)
        .on_conflict_do_update(
            index_elements=[SiteSetting.key],
            set_={"value": value},
        )
        .returning(SiteSetting.id)
    )
    await db.execute(stmt)
    await db.flush()
    setting = await get_by_key(db, key)
    assert setting is not None
    await db.refresh(setting)
    return setting
