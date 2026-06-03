from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_user_optional
from app.core.responses import success
from app.models.user import User
from app.schemas.common import SuccessEnvelope
from app.schemas.user import (
    UserPrivate,
    UserProfileData,
    UserPublic,
    UserPublicProfileData,
    UsernameAvailabilityResponse,
    UserUpdateRequest,
)
from app.services import (
    check_username_availability,
    get_me,
    get_public_profile,
    update_me,
)
from app.services._helpers import normalize_username

router = APIRouter()


@router.get(
    "/me",
    response_model=SuccessEnvelope[UserProfileData],
    summary="Get current user profile",
)
async def get_users_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = await get_me(db, current_user)
    return success(
        {"user": UserPrivate.model_validate(user).model_dump(mode="json")}
    )


@router.patch(
    "/me",
    response_model=SuccessEnvelope[UserProfileData],
    summary="Update current user profile",
)
async def patch_users_me(
    body: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = await update_me(db, current_user, body)
    return success(
        {"user": UserPrivate.model_validate(user).model_dump(mode="json")}
    )


@router.get(
    "/username-availability",
    response_model=SuccessEnvelope[UsernameAvailabilityResponse],
    summary="Check username availability",
)
async def get_username_availability(
    username: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    normalized = normalize_username(username)
    available = await check_username_availability(db, username, current_user)
    return success({"username": normalized, "available": available})


@router.get(
    "/{user_id}",
    response_model=SuccessEnvelope[UserPublicProfileData],
    summary="Get public user profile",
)
async def get_user_by_id(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    user = await get_public_profile(db, user_id)
    return success(
        {"user": UserPublic.model_validate(user).model_dump(mode="json")}
    )
