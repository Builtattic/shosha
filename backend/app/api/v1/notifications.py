from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.responses import success
from app.models.user import User
from app.schemas.common import PaginatedResponse, SuccessEnvelope
from app.schemas.notification import NotificationOut, UnreadCountResponse
from app.services import (
    get_notifications,
    get_unread_count,
    mark_all_notifications_read,
    mark_notification_read,
)

router = APIRouter()


def _serialize_notifications(items: list) -> list[dict]:
    return [
        NotificationOut.model_validate(n).model_dump(mode="json") for n in items
    ]


@router.get(
    "/",
    response_model=SuccessEnvelope[PaginatedResponse[NotificationOut]],
    summary="List notifications",
)
async def get_notifications_list(
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, next_cursor = await get_notifications(db, current_user, limit, cursor)
    return success({"items": _serialize_notifications(items), "next_cursor": next_cursor})


@router.post(
    "/read-all",
    response_model=SuccessEnvelope[dict],
    summary="Mark all notifications as read",
)
async def post_notifications_read_all(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await mark_all_notifications_read(db, current_user)
    return success(result)


@router.get(
    "/unread-count",
    response_model=SuccessEnvelope[UnreadCountResponse],
    summary="Get unread notification count",
)
async def get_notifications_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await get_unread_count(db, current_user)
    return success(result)


@router.post(
    "/{notification_id}/read",
    response_model=SuccessEnvelope[dict],
    summary="Mark notification as read",
)
async def post_notification_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    notification = await mark_notification_read(db, notification_id, current_user)
    return success(
        {
            "notification": NotificationOut.model_validate(notification).model_dump(
                mode="json"
            )
        }
    )
