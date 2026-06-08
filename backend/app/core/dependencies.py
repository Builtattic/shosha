from __future__ import annotations

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.firebase import verify_firebase_token
from app.models.enums import UserRole
from app.models.user import User

_bearer = HTTPBearer()
_bearer_optional = HTTPBearer(auto_error=False)

_MODERATOR_ROLES = {UserRole.MODERATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN}
_ADMIN_ROLES = {UserRole.ADMIN, UserRole.SUPER_ADMIN}


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    decoded = verify_firebase_token(credentials.credentials)
    uid = decoded["uid"]
    result = await db.execute(select(User).where(User.firebase_uid == uid))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="User account is inactive")
    return user


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_optional),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if credentials is None:
        return None
    decoded = verify_firebase_token(credentials.credentials)
    uid = decoded["uid"]
    result = await db.execute(select(User).where(User.firebase_uid == uid))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="User account is inactive")
    return user


def require_moderator(user: User = Depends(get_current_user)) -> User:
    if user.role not in _MODERATOR_ROLES:
        raise HTTPException(status_code=403, detail="Moderator access required")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role not in _ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def require_super_admin(user: User = Depends(get_current_user)) -> User:
    if user.role not in {UserRole.ADMIN, UserRole.SUPER_ADMIN}:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
