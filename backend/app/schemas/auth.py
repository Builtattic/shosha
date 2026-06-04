from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import validate_http_url
from app.schemas.user import UserPrivate


class SessionSyncRequest(BaseModel):
    display_name: str | None = Field(default=None, max_length=128)
    photo_url: str | None = Field(default=None, max_length=1024)

    @field_validator("photo_url")
    @classmethod
    def validate_photo_url(cls, value: str | None) -> str | None:
        if value is None:
            return value
        trimmed = value.strip()
        if not trimmed:
            return None
        if len(trimmed) > 1024:
            trimmed = trimmed[:1024]
        return validate_http_url(trimmed)


class SessionSyncResponse(BaseModel):
    user: UserPrivate
    is_new_user: bool
