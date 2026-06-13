from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import UserRole
from app.models.user import User
from app.repositories import user_repository

SYSTEM_USERNAME = "shosha_system"
SYSTEM_EMAIL = "system@shosha.internal"
SYSTEM_FIREBASE_UID = "system:shosha-automation"


async def get_or_create_system_actor(db: AsyncSession) -> User:
    """
    Production-safe system user for automated admin actions (e.g. community auto-reject).
    Idempotent upsert by username; email avoids seed-* purge patterns in dev reseed.
    """
    existing = await user_repository.get_by_username(db, SYSTEM_USERNAME)
    if existing is not None:
        return existing

    by_uid = await user_repository.get_by_firebase_uid(db, SYSTEM_FIREBASE_UID)
    if by_uid is not None:
        return await user_repository.update(
            db,
            by_uid,
            username=SYSTEM_USERNAME,
            is_active=False,
            display_name="Shosha System",
        )

    user = await user_repository.create(
        db,
        firebase_uid=SYSTEM_FIREBASE_UID,
        email=SYSTEM_EMAIL,
        display_name="Shosha System",
        photo_url=None,
    )
    return await user_repository.update(
        db,
        user,
        username=SYSTEM_USERNAME,
        is_active=False,
        role=UserRole.USER,
    )
