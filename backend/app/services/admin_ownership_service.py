from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import raise_api_error
from app.models.enums import AdminActionType
from app.repositories import account_repository, user_repository
from app.services import admin_action_service


async def assign_ownership(
    db: AsyncSession,
    account_id: UUID,
    user_id: UUID,
    actor_id: UUID,
) -> dict:
    account = await account_repository.get_by_id(db, account_id)
    if account is None:
        raise_api_error("not_found", "Account not found")

    user = await user_repository.get_by_id(db, user_id)
    if user is None:
        raise_api_error("not_found", "User not found")

    account = await account_repository.update(db, account, owner_user_id=user_id)
    await db.commit()

    await admin_action_service.log_action(
        db,
        actor_user_id=actor_id,
        action_type=AdminActionType.OWNERSHIP_ASSIGN,
        target_type="account",
        target_id=account_id,
        metadata_json={
            "assigned_to_user_id": str(user_id),
            "actor_id": str(actor_id),
        },
    )
    return {"account": account, "user": user}


async def revoke_ownership(
    db: AsyncSession,
    account_id: UUID,
    actor_id: UUID,
) -> dict:
    account = await account_repository.get_by_id(db, account_id)
    if account is None:
        raise_api_error("not_found", "Account not found")

    previous_owner = account.owner_user_id

    account = await account_repository.update(db, account, owner_user_id=None)
    await db.commit()

    await admin_action_service.log_action(
        db,
        actor_user_id=actor_id,
        action_type=AdminActionType.OWNERSHIP_REVOKE,
        target_type="account",
        target_id=account_id,
        metadata_json={
            "revoked_by": str(actor_id),
            "previous_owner": str(previous_owner) if previous_owner else None,
        },
    )
    return {"account": account}
