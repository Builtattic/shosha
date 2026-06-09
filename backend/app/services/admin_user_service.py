from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import raise_api_error
from app.models.enums import AdminActionType, UserRole
from app.models.user import User
from app.repositories import user_repository
from app.services import admin_action_service

_PATCHABLE_FIELDS = {"role", "is_active", "email", "username", "display_name", "photo_url"}
_ROLE_CHANGE_ROLES = {UserRole.ADMIN, UserRole.SUPER_ADMIN}


async def list_users(db: AsyncSession, limit: int = 500) -> list[User]:
    return await user_repository.list_all(db, limit)


async def get_user(db: AsyncSession, user_id: UUID) -> User:
    user = await user_repository.get_by_id(db, user_id)
    if user is None:
        raise_api_error("not_found", "User not found")
    return user


async def update_user(
    db: AsyncSession,
    user_id: UUID,
    actor: User,
    **fields: object,
) -> User:
    fields = {k: v for k, v in fields.items() if k in _PATCHABLE_FIELDS}

    if "role" in fields:
        if actor.role not in _ROLE_CHANGE_ROLES:
            raise_api_error("forbidden", "Only admins can change roles")
        if user_id == actor.id:
            raise_api_error("forbidden", "Cannot change your own role")

    user = await user_repository.get_by_id(db, user_id)
    if user is None:
        raise_api_error("not_found", "User not found")

    if "username" in fields and fields["username"] != user.username:
        existing = await user_repository.get_by_username(db, fields["username"])
        if existing is not None:
            raise_api_error("conflict", "Username already taken")

    user = await user_repository.update(db, user, **fields)
    await db.commit()

    await admin_action_service.log_action(
        db,
        actor_user_id=actor.id,
        action_type=AdminActionType.USER_UPDATE,
        target_type="user",
        target_id=user_id,
        metadata_json={
            "fields_changed": list(fields.keys()),
            "actor_id": str(actor.id),
        },
    )
    return user


async def delete_user(db: AsyncSession, user_id: UUID, actor: User) -> None:
    if user_id == actor.id:
        raise_api_error("forbidden", "Cannot delete your own account")

    user = await user_repository.get_by_id(db, user_id)
    if user is None:
        raise_api_error("not_found", "User not found")

    await user_repository.delete_user(db, user)
    await db.commit()

    await admin_action_service.log_action(
        db,
        actor_user_id=actor.id,
        action_type=AdminActionType.USER_DELETE,
        target_type="user",
        target_id=user_id,
        metadata_json={"deleted_by": str(actor.id)},
    )
