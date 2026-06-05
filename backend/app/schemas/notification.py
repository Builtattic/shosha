from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.enums import NotificationType


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    notification_type: NotificationType
    title: str
    message: str
    is_read: bool
    read_at: datetime | None
    metadata_json: dict | None
    created_at: datetime


class NotificationListResponse(BaseModel):
    items: list[NotificationOut]
    next_cursor: str | None = None


class UnreadCountResponse(BaseModel):
    count: int
