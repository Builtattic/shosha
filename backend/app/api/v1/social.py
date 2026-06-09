from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_user_optional
from app.core.responses import success
from app.models.user import User
from app.repositories import follow_repository
from app.services import follow_service

router = APIRouter()


@router.get("/users/{user_id}/follow-status")
async def get_follow_status(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    is_following = await follow_repository.is_following(
        db,
        current_user.id if current_user else None,
        user_id,
    )
    return success({"is_following": is_following, "user_id": str(user_id)})


@router.post("/users/{user_id}/follow")
async def post_follow_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await follow_service.follow_user(db, user_id, current_user.id)
    return success(result)


@router.delete("/users/{user_id}/follow")
async def delete_follow_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await follow_service.unfollow_user(db, user_id, current_user.id)
    return success(result)


@router.get("/users/{user_id}/connections")
async def get_user_connections(
    user_id: UUID,
    type: str = Query(default="followers"),
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    connection_type = "following" if type == "following" else "followers"
    result = await follow_service.get_connections(
        db,
        user_id,
        connection_type,
        limit,
        current_user.id if current_user else None,
    )
    return success(result)
