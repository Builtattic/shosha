from __future__ import annotations

import firebase_admin
from fastapi import HTTPException
from firebase_admin import auth

from app.core.config import settings


def _ensure_firebase_initialized() -> None:
    if not firebase_admin._apps:
        # FIREBASE_AUTH_EMULATOR_HOST in root .env is honored by the Admin SDK automatically.
        firebase_admin.initialize_app(options={"projectId": settings.FIREBASE_PROJECT_ID})


def verify_firebase_token(token: str) -> dict:
    _ensure_firebase_initialized()
    try:
        return auth.verify_id_token(token)
    except Exception as exc:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token",
        ) from exc
