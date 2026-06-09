from __future__ import annotations

import asyncio
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import raise_api_error
from app.repositories import follow_repository as repo
from app.repositories import user_repository


async def follow_user(
    db: AsyncSession,
    target_user_id: UUID,
    current_user_id: UUID,
) -> dict:
    if target_user_id == current_user_id:
        raise_api_error("forbidden", "Cannot follow yourself")

    target = await user_repository.get_by_id(db, target_user_id)
    if target is None:
        raise_api_error("not_found", "User not found")

    await repo.create(db, follower_id=current_user_id, following_id=target_user_id)
    await db.commit()
    return {"following": True}


async def unfollow_user(
    db: AsyncSession,
    target_user_id: UUID,
    current_user_id: UUID,
) -> dict:
    await repo.delete_by_pair(db, current_user_id, target_user_id)
    await db.commit()
    return {"following": False}


def _serialize_user(
    user,
    *,
    viewer_id: UUID | None,
    is_following: bool,
) -> dict:
    return {
        "id": str(user.id),
        "username": user.username,
        "display_name": user.display_name,
        "photo_url": user.photo_url,
        "is_self": viewer_id == user.id if viewer_id else False,
        "is_following": is_following,
    }


async def get_connections(
    db: AsyncSession,
    user_id: UUID,
    connection_type: str,
    limit: int,
    viewer_id: UUID | None,
) -> dict:
    if connection_type == "following":
        records = await repo.list_following(db, user_id, limit)
        user_ids = [r.following_id for r in records]
        total = await repo.count_following(db, user_id)
    else:
        records = await repo.list_followers(db, user_id, limit)
        user_ids = [r.follower_id for r in records]
        total = await repo.count_followers(db, user_id)

    users = await asyncio.gather(
        *[user_repository.get_by_id(db, uid) for uid in user_ids]
    )

    serialized = []
    for user in users:
        if user is None:
            continue
        is_following = False
        if viewer_id is not None:
            is_following = await repo.is_following(db, viewer_id, user.id)
        serialized.append(
            _serialize_user(user, viewer_id=viewer_id, is_following=is_following)
        )

    return {
        "type": connection_type,
        "total": total,
        "users": serialized,
    }
