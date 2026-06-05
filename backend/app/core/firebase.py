from __future__ import annotations

import json

import firebase_admin
from fastapi import HTTPException
from firebase_admin import auth, credentials

from app.core.config import settings


def _service_account_info() -> dict | None:
    if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
        return json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
    if settings.FIREBASE_CLIENT_EMAIL and settings.FIREBASE_PRIVATE_KEY:
        return {
            "type": "service_account",
            "project_id": settings.FIREBASE_PROJECT_ID,
            "private_key": settings.FIREBASE_PRIVATE_KEY.replace("\\n", "\n"),
            "client_email": settings.FIREBASE_CLIENT_EMAIL,
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    return None


def _ensure_firebase_initialized() -> None:
    if not firebase_admin._apps:
        info = _service_account_info()
        if info is not None:
            firebase_admin.initialize_app(credentials.Certificate(info))
        else:
            # FIREBASE_AUTH_EMULATOR_HOST in root .env is honored by the Admin SDK automatically.
            firebase_admin.initialize_app(
                options={"projectId": settings.FIREBASE_PROJECT_ID}
            )


def verify_firebase_token(token: str) -> dict:
    _ensure_firebase_initialized()
    try:
        decoded = auth.verify_id_token(token, clock_skew_seconds=5)
        return decoded
    except Exception as exc:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token",
        ) from exc
