from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import raise_api_error
from app.models.user import User
from app.repositories import get_by_username, get_user_by_id, update_user
from app.repositories import follow_repository
from app.schemas.user import UserUpdateRequest
from app.services._helpers import normalize_username, validate_username_format


async def get_me(db: AsyncSession, current_user: User) -> User:
    return await with_follow_counts(db, current_user)


async def with_follow_counts(db: AsyncSession, user: User) -> User:
    user.followers_count = await follow_repository.count_followers(db, user.id)
    user.following_count = await follow_repository.count_following(db, user.id)
    return user


async def update_me(
    db: AsyncSession,
    current_user: User,
    data: UserUpdateRequest,
) -> User:
    fields = data.model_dump(exclude_unset=True, exclude_none=True)
    if "username" in fields:
        fields["username"] = normalize_username(fields["username"])
        validate_username_format(fields["username"])
        existing = await get_by_username(db, fields["username"])
        if existing is not None and existing.id != current_user.id:
            raise_api_error("conflict", "Username already taken")

    if not fields:
        return current_user

    user = await update_user(db, current_user, **fields)
    await db.commit()
    await db.refresh(user)
    return user


async def check_username_availability(
    db: AsyncSession,
    username: str,
    current_user: User,
) -> bool:
    normalized = normalize_username(username)
    validate_username_format(normalized)
    existing = await get_by_username(db, normalized)
    return existing is None or existing.id == current_user.id


async def get_public_profile(db: AsyncSession, user_id: UUID) -> User:
    user = await get_user_by_id(db, user_id)
    if user is None:
        raise_api_error("not_found", "User not found")
    return await with_follow_counts(db, user)
