from __future__ import annotations

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import raise_api_error
from app.core.responses import success
from app.models.enums import DeletionRequestStatus
from app.models.user import User
from app.repositories import deletion_request_repository
from app.services import deletion_request_service, me_service

router = APIRouter()


class DeletionRequestCreate(BaseModel):
    reason: str
    details: str | None = Field(default=None, max_length=1000)
    attachment_urls: list[str] = Field(default_factory=list, max_length=5)


@router.get("/me/bookmarks")
async def get_me_bookmarks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await me_service.get_bookmarks(db, current_user.id)
    return success({"bookmarks": result})


@router.get("/me/filings")
async def get_me_filings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await me_service.get_filings(db, current_user.id)
    return success(result)


@router.post("/me/deletion-request")
async def post_me_deletion_request(
    data: DeletionRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await deletion_request_repository.list_by_user(
        db, current_user.id, limit=5
    )
    if any(r.status == DeletionRequestStatus.PENDING for r in existing):
        raise_api_error("conflict", "A pending deletion request already exists")

    user_snapshot = {
        "username": current_user.username,
        "email": current_user.email,
    }
    req = await deletion_request_service.create_deletion_request(
        db,
        current_user.id,
        user_snapshot,
        data.reason,
        data.details,
        data.attachment_urls or [],
    )
    return success({"success": True, "request_id": str(req.id)})


@router.post("/me/score/replay")
async def post_me_score_replay(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await me_service.get_score_replay(db, current_user.id)
    return success(result)


@router.get("/me/swipe-aggregate")
async def get_me_swipe_aggregate(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await me_service.get_swipe_aggregate(db, current_user.id)
    return success(result)
