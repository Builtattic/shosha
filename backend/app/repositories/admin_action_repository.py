from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin_action import AdminAction
from app.models.enums import AdminActionType


async def create(
    db: AsyncSession,
    actor_user_id: UUID,
    action_type: AdminActionType,
    target_type: str,
    target_id: UUID,
    reason: str | None = None,
    metadata_json: dict | None = None,
) -> AdminAction:
    admin_action = AdminAction(
        actor_user_id=actor_user_id,
        action_type=action_type,
        target_type=target_type,
        target_id=target_id,
        reason=reason,
        metadata_json=metadata_json,
    )
    db.add(admin_action)
    await db.flush()
    await db.refresh(admin_action)
    return admin_action


async def list_recent(db: AsyncSession, limit: int = 300) -> list[AdminAction]:
    result = await db.execute(
        select(AdminAction)
        .order_by(AdminAction.created_at.desc(), AdminAction.id.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, action_id: UUID) -> AdminAction | None:
    result = await db.execute(
        select(AdminAction).where(AdminAction.id == action_id)
    )
    return result.scalar_one_or_none()
