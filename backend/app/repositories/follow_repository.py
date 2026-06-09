from __future__ import annotations

from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_follow import UserFollow


async def create(
    db: AsyncSession,
    follower_id: UUID,
    following_id: UUID,
) -> UserFollow:
    existing = await get_by_pair(db, follower_id, following_id)
    if existing is not None:
        return existing
    follow = UserFollow(follower_id=follower_id, following_id=following_id)
    db.add(follow)
    await db.flush()
    await db.refresh(follow)
    return follow


async def get_by_pair(
    db: AsyncSession,
    follower_id: UUID,
    following_id: UUID,
) -> UserFollow | None:
    result = await db.execute(
        select(UserFollow).where(
            UserFollow.follower_id == follower_id,
            UserFollow.following_id == following_id,
        )
    )
    return result.scalar_one_or_none()


async def delete_by_pair(
    db: AsyncSession,
    follower_id: UUID,
    following_id: UUID,
) -> bool:
    result = await db.execute(
        delete(UserFollow).where(
            UserFollow.follower_id == follower_id,
            UserFollow.following_id == following_id,
        )
    )
    await db.flush()
    return (result.rowcount or 0) > 0


async def list_followers(
    db: AsyncSession,
    user_id: UUID,
    limit: int = 50,
) -> list[UserFollow]:
    result = await db.execute(
        select(UserFollow)
        .where(UserFollow.following_id == user_id)
        .order_by(UserFollow.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def list_following(
    db: AsyncSession,
    user_id: UUID,
    limit: int = 50,
) -> list[UserFollow]:
    result = await db.execute(
        select(UserFollow)
        .where(UserFollow.follower_id == user_id)
        .order_by(UserFollow.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def count_followers(db: AsyncSession, user_id: UUID) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(UserFollow)
        .where(UserFollow.following_id == user_id)
    )
    return result.scalar_one()


async def count_following(db: AsyncSession, user_id: UUID) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(UserFollow)
        .where(UserFollow.follower_id == user_id)
    )
    return result.scalar_one()


async def is_following(
    db: AsyncSession,
    follower_id: UUID | None,
    following_id: UUID,
) -> bool:
    if follower_id is None:
        return False
    result = await db.execute(
        select(func.count())
        .select_from(UserFollow)
        .where(
            UserFollow.follower_id == follower_id,
            UserFollow.following_id == following_id,
        )
    )
    return result.scalar_one() > 0
