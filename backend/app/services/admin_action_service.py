from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin_action import AdminAction
from app.models.enums import AdminActionType
from app.repositories import admin_action_repository as repo


async def log_action(
    db: AsyncSession,
    actor_user_id: UUID,
    action_type: AdminActionType,
    target_type: str,
    target_id: UUID,
    reason: str | None = None,
    metadata_json: dict | None = None,
) -> AdminAction:
    admin_action = await repo.create(
        db,
        actor_user_id,
        action_type,
        target_type,
        target_id,
        reason,
        metadata_json,
    )
    await db.commit()
    return admin_action


async def list_recent(db: AsyncSession, limit: int = 300) -> list[AdminAction]:
    return await repo.list_recent(db, limit)
