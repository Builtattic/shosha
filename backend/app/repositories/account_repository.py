from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.account import Account, AccountSocialLink
from app.models.enums import AccountStatus
from app.core.scoring_constants import BASE_SCORE
from app.repositories._pagination import (
    apply_created_at_cursor,
    build_next_cursor,
    decode_cursor,
)

_ACCOUNT_LOAD_OPTIONS = (selectinload(Account.social_links),)


async def get_by_id(db: AsyncSession, account_id: UUID) -> Account | None:
    result = await db.execute(
        select(Account)
        .where(Account.id == account_id)
        .options(*_ACCOUNT_LOAD_OPTIONS)
    )
    return result.scalar_one_or_none()


async def get_by_platform_handle(
    db: AsyncSession,
    platform: str,
    handle: str,
) -> Account | None:
    result = await db.execute(
        select(Account)
        .where(Account.platform == platform, Account.handle == handle)
        .options(*_ACCOUNT_LOAD_OPTIONS)
    )
    return result.scalar_one_or_none()


async def list_accounts(
    db: AsyncSession,
    platform: str | None,
    status: AccountStatus | None,
    limit: int,
    cursor: str | None,
    owner_user_id: UUID | None = None,
) -> tuple[list[Account], str | None]:
    stmt = select(Account)
    if platform is not None:
        stmt = stmt.where(Account.platform == platform)
    if status is not None:
        stmt = stmt.where(Account.status == status)
    if owner_user_id is not None:
        stmt = stmt.where(Account.owner_user_id == owner_user_id)
    stmt = apply_created_at_cursor(
        stmt, Account.created_at, decode_cursor(cursor), descending=True
    )
    stmt = stmt.order_by(Account.created_at.desc(), Account.id.desc()).limit(limit + 1)
    result = await db.execute(stmt)
    return build_next_cursor(list(result.scalars().all()), limit)


async def search(
    db: AsyncSession,
    q: str,
    platform: str | None,
    limit: int,
    cursor: str | None,
) -> tuple[list[Account], str | None]:
    pattern = f"%{q}%"
    stmt = select(Account).where(
        or_(Account.handle.ilike(pattern), Account.display_name.ilike(pattern))
    )
    if platform is not None:
        stmt = stmt.where(Account.platform == platform)
    stmt = apply_created_at_cursor(
        stmt, Account.created_at, decode_cursor(cursor), descending=True
    )
    stmt = stmt.order_by(Account.created_at.desc(), Account.id.desc()).limit(limit + 1)
    result = await db.execute(stmt)
    return build_next_cursor(list(result.scalars().all()), limit)


async def create(
    db: AsyncSession,
    platform: str,
    handle: str,
    display_name: str | None,
    bio: str | None,
) -> Account:
    account = Account(
        platform=platform,
        handle=handle,
        display_name=display_name,
        bio=bio,
    )
    db.add(account)
    await db.flush()
    await db.refresh(account)
    return account


async def update(db: AsyncSession, account: Account, **fields: object) -> Account:
    for key, value in fields.items():
        setattr(account, key, value)
    await db.flush()
    await db.refresh(account)
    return account


async def get_social_links(db: AsyncSession, account_id: UUID) -> list[AccountSocialLink]:
    result = await db.execute(
        select(AccountSocialLink)
        .where(AccountSocialLink.account_id == account_id)
        .order_by(AccountSocialLink.platform)
    )
    return list(result.scalars().all())


async def upsert_social_link(
    db: AsyncSession,
    account_id: UUID,
    platform: str,
    url: str,
    is_verified: bool,
) -> AccountSocialLink:
    stmt = (
        insert(AccountSocialLink)
        .values(
            account_id=account_id,
            platform=platform,
            url=url,
            is_verified=is_verified,
        )
        .on_conflict_do_update(
            constraint="uq_account_social_links_account_platform",
            set_={"url": url, "is_verified": is_verified},
        )
        .returning(AccountSocialLink)
    )
    result = await db.execute(stmt)
    link = result.scalar_one()
    await db.flush()
    await db.refresh(link)
    return link


async def count_accounts(db: AsyncSession) -> int:
    result = await db.execute(select(func.count()).select_from(Account))
    return result.scalar_one()


async def count_by_status(db: AsyncSession) -> dict[str, int]:
    counts = {s.value: 0 for s in AccountStatus}
    result = await db.execute(
        select(Account.status, func.count()).group_by(Account.status)
    )
    for status, count in result.all():
        counts[status.value] = count
    return counts


async def list_top_accounts(
    db: AsyncSession,
    limit: int = 60,
) -> list[Account]:
    result = await db.execute(
        select(Account)
        .where(Account.status == AccountStatus.ACTIVE)
        .options(*_ACCOUNT_LOAD_OPTIONS)
        .order_by(Account.score.desc(), Account.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def list_trending_accounts(
    db: AsyncSession,
    limit: int = 10,
) -> list[Account]:
    result = await db.execute(
        select(Account)
        .where(
            Account.status == AccountStatus.ACTIVE,
            Account.score > BASE_SCORE,
        )
        .order_by(Account.score.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def list_all_admin(db: AsyncSession, limit: int = 500) -> list[Account]:
    result = await db.execute(
        select(Account)
        .options(*_ACCOUNT_LOAD_OPTIONS)
        .order_by(Account.score.desc().nulls_last())
        .limit(limit)
    )
    return list(result.scalars().all())


async def list_by_owner(
    db: AsyncSession,
    owner_user_id: UUID,
    limit: int = 50,
) -> list[Account]:
    result = await db.execute(
        select(Account)
        .where(Account.owner_user_id == owner_user_id)
        .options(*_ACCOUNT_LOAD_OPTIONS)
        .order_by(Account.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def owner_profile_score(db: AsyncSession, owner_user_id: UUID) -> float:
    """Live profile score: website account if present, else highest owned account."""
    accounts = await list_by_owner(db, owner_user_id, limit=50)
    if not accounts:
        return 0.0
    for account in accounts:
        if account.platform == "website":
            return float(account.score or 0)
    return max(float(account.score or 0) for account in accounts)


async def list_all_account_ids(db: AsyncSession) -> list[UUID]:
    result = await db.execute(select(Account.id))
    return list(result.scalars().all())


async def get_momentum_status(db: AsyncSession) -> tuple[datetime | None, int]:
    last_run_result = await db.execute(select(func.max(Account.momentum_updated_at)))
    last_run_at = last_run_result.scalar_one_or_none()
    count_result = await db.execute(
        select(func.count())
        .select_from(Account)
        .where(Account.w1_delta.is_not(None))
    )
    return last_run_at, count_result.scalar_one()


async def count_accounts_with_higher_score(db: AsyncSession, score: float) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(Account)
        .where(
            Account.status == AccountStatus.ACTIVE,
            Account.score > score,
        )
    )
    return result.scalar_one()
