from __future__ import annotations

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.firebase import verify_firebase_token
from app.models.enums import UserRole
from app.models.user import User

_bearer_optional = HTTPBearer(auto_error=False)
_ADMIN_ROLES = {UserRole.ADMIN, UserRole.SUPER_ADMIN}


async def verify_cron_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_optional),
    db: AsyncSession = Depends(get_db),
) -> None:
    if (
        credentials is not None
        and settings.CRON_TOKEN
        and credentials.credentials == settings.CRON_TOKEN
    ):
        return

    if credentials is not None:
        try:
            decoded = verify_firebase_token(credentials.credentials)
            uid = decoded["uid"]
            result = await db.execute(select(User).where(User.firebase_uid == uid))
            user = result.scalar_one_or_none()
            if user is not None and user.is_active and user.role in _ADMIN_ROLES:
                return
        except HTTPException:
            raise
        except Exception:
            pass

    raise HTTPException(status_code=401, detail="Unauthorized")
