from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import raise_api_error
from app.models.account import Account
from app.models.enums import AccountStatus, AdminActionType
from app.repositories import account_repository
from app.services import admin_action_service

_PATCHABLE_FIELDS = {"display_name", "bio", "status", "score", "owner_user_id"}


async def list_accounts(db: AsyncSession, limit: int = 500) -> list[Account]:
    return await account_repository.list_all_admin(db, limit)


async def get_account(db: AsyncSession, account_id: UUID) -> Account:
    account = await account_repository.get_by_id(db, account_id)
    if account is None:
        raise_api_error("not_found", "Account not found")
    return account


async def create_account(
    db: AsyncSession,
    actor_id: UUID,
    platform: str,
    handle: str,
    display_name: str | None,
    bio: str | None,
) -> Account:
    existing = await account_repository.get_by_platform_handle(db, platform, handle)
    if existing is not None:
        return existing

    account = await account_repository.create(
        db,
        platform,
        handle,
        display_name or handle,
        bio or "",
    )
    await db.commit()

    await admin_action_service.log_action(
        db,
        actor_user_id=actor_id,
        action_type=AdminActionType.ACCOUNT_CREATE,
        target_type="account",
        target_id=account.id,
        metadata_json={"actor_id": str(actor_id)},
    )
    return account


async def update_account(
    db: AsyncSession,
    account_id: UUID,
    actor_id: UUID,
    **fields: object,
) -> Account:
    fields = {k: v for k, v in fields.items() if k in _PATCHABLE_FIELDS}

    account = await account_repository.get_by_id(db, account_id)
    if account is None:
        raise_api_error("not_found", "Account not found")

    account = await account_repository.update(db, account, **fields)
    await db.commit()

    await admin_action_service.log_action(
        db,
        actor_user_id=actor_id,
        action_type=AdminActionType.ACCOUNT_UPDATE,
        target_type="account",
        target_id=account_id,
        metadata_json={"fields_changed": list(fields.keys())},
    )
    return account


async def delete_account(db: AsyncSession, account_id: UUID, actor_id: UUID) -> None:
    account = await account_repository.get_by_id(db, account_id)
    if account is None:
        raise_api_error("not_found", "Account not found")

    await account_repository.update(db, account, status=AccountStatus.REMOVED)
    await db.commit()

    await admin_action_service.log_action(
        db,
        actor_user_id=actor_id,
        action_type=AdminActionType.ACCOUNT_DELETE,
        target_type="account",
        target_id=account_id,
        metadata_json={"deleted_by": str(actor_id)},
    )
