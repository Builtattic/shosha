from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories import (
    create_user,
    get_by_firebase_uid,
    update_last_login,
    update_user,
)


async def sync_session(
    db: AsyncSession,
    firebase_uid: str,
    email: str | None,
    display_name: str | None,
    photo_url: str | None,
) -> tuple[User, bool]:
    user = await get_by_firebase_uid(db, firebase_uid)
    if user is None:
        user = await create_user(db, firebase_uid, email, display_name, photo_url)
        await db.commit()
        await db.refresh(user)
        return user, True

    fields: dict[str, object] = {}
    if display_name is not None:
        fields["display_name"] = display_name
    if photo_url is not None:
        fields["photo_url"] = photo_url
    if fields:
        user = await update_user(db, user, **fields)
    user = await update_last_login(db, user)
    await db.commit()
    await db.refresh(user)
    return user, False
