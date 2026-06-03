from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.firebase import verify_firebase_token
from app.core.responses import success
from app.schemas.auth import SessionSyncRequest, SessionSyncResponse
from app.schemas.common import SuccessEnvelope
from app.schemas.user import UserPrivate
from app.services import sync_session

router = APIRouter()
_bearer = HTTPBearer()


@router.post(
    "/session/sync",
    response_model=SuccessEnvelope[SessionSyncResponse],
    summary="Sync Firebase session to local user",
)
async def post_session_sync(
    body: SessionSyncRequest,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
):
    decoded = verify_firebase_token(credentials.credentials)
    user, is_new_user = await sync_session(
        db,
        decoded["uid"],
        decoded.get("email"),
        body.display_name or decoded.get("name"),
        body.photo_url or decoded.get("picture"),
    )
    return success(
        {
            "user": UserPrivate.model_validate(user).model_dump(mode="json"),
            "is_new_user": is_new_user,
        }
    )
