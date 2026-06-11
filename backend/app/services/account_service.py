from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import raise_api_error
from app.models.account import Account, AccountSocialLink
from app.models.enums import AccountStatus
from app.models.user import User
from app.repositories import (
    create_account as repo_create_account,
    get_account_by_id,
    get_by_platform_handle,
    get_social_links as repo_get_social_links,
    list_accounts as repo_list_accounts,
    search_accounts as repo_search_accounts,
    update_account as repo_update_account,
    upsert_social_link,
)
from app.schemas.account import (
    AccountCreateRequest,
    AccountUpdateRequest,
    SocialLinkCreateRequest,
)
from app.services._helpers import (
    is_admin,
    is_moderator_plus,
    normalize_handle,
    validate_platform,
    validate_search_query,
)


def _can_edit_account(account: Account, user: User) -> bool:
    return account.owner_user_id == user.id or is_moderator_plus(user)


def _resolve_list_status(
    current_user: User | None,
    status: AccountStatus | None,
) -> AccountStatus | None:
    if is_admin(current_user):
        return status
    if status == AccountStatus.REMOVED:
        raise_api_error("forbidden", "Cannot list removed accounts")
    if status is None:
        return AccountStatus.ACTIVE
    return status


async def create_account(
    db: AsyncSession,
    data: AccountCreateRequest,
    current_user: User,
) -> Account:
    validate_platform(data.platform)
    handle = normalize_handle(data.handle)
    existing = await get_by_platform_handle(db, data.platform, handle)
    if existing is not None:
        raise_api_error("conflict", "Account with this platform and handle already exists")

    account = await repo_create_account(
        db,
        data.platform,
        handle,
        data.display_name,
        data.bio,
    )
    await db.commit()
    await db.refresh(account)
    return account


async def list_accounts(
    db: AsyncSession,
    platform: str | None,
    status: AccountStatus | None,
    limit: int,
    cursor: str | None,
    current_user: User | None,
    owner_user_id: UUID | None = None,
) -> tuple[list[Account], str | None]:
    effective_status = _resolve_list_status(current_user, status)
    return await repo_list_accounts(
        db, platform, effective_status, limit, cursor, owner_user_id
    )


async def search_accounts(
    db: AsyncSession,
    q: str,
    platform: str | None,
    limit: int,
    cursor: str | None,
) -> tuple[list[Account], str | None]:
    validated_q = validate_search_query(q)
    return await repo_search_accounts(db, validated_q, platform, limit, cursor)


async def get_account(
    db: AsyncSession,
    account_id: UUID,
    current_user: User | None,
) -> Account:
    account = await get_account_by_id(db, account_id)
    if account is None:
        raise_api_error("not_found", "Account not found")
    return account


async def update_account(
    db: AsyncSession,
    account_id: UUID,
    data: AccountUpdateRequest,
    current_user: User,
) -> Account:
    account = await get_account_by_id(db, account_id)
    if account is None:
        raise_api_error("not_found", "Account not found")
    if not _can_edit_account(account, current_user):
        raise_api_error("forbidden", "Not authorized to update this account")

    fields = data.model_dump(exclude_unset=True, exclude_none=True)
    if not fields:
        return account

    account = await repo_update_account(db, account, **fields)
    await db.commit()
    await db.refresh(account)
    return account


async def get_social_links(
    db: AsyncSession,
    account_id: UUID,
) -> list[AccountSocialLink]:
    account = await get_account_by_id(db, account_id)
    if account is None:
        raise_api_error("not_found", "Account not found")
    return await repo_get_social_links(db, account_id)


async def add_social_link(
    db: AsyncSession,
    account_id: UUID,
    data: SocialLinkCreateRequest,
    current_user: User,
) -> AccountSocialLink:
    account = await get_account_by_id(db, account_id)
    if account is None:
        raise_api_error("not_found", "Account not found")
    if not _can_edit_account(account, current_user):
        raise_api_error("forbidden", "Not authorized to update this account")

    validate_platform(data.platform)
    link = await upsert_social_link(
        db,
        account_id,
        data.platform,
        data.url,
        data.is_verified,
    )
    await db.commit()
    await db.refresh(link)
    return link
