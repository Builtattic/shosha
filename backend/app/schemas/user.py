from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import UserRole
from app.schemas.common import validate_http_url

_USERNAME_PATTERN = r"^[a-z0-9_]+$"


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    username: str | None
    display_name: str | None
    photo_url: str | None
    role: UserRole
    created_at: datetime


class UserPrivate(UserPublic):
    email: str | None
    is_active: bool
    last_login_at: datetime | None


class UserUpdateRequest(BaseModel):
    username: str | None = Field(
        default=None,
        min_length=3,
        max_length=64,
        pattern=_USERNAME_PATTERN,
    )
    display_name: str | None = Field(default=None, max_length=128)
    photo_url: str | None = Field(default=None, max_length=1024)

    @field_validator("photo_url")
    @classmethod
    def validate_photo_url(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return validate_http_url(value)


class UsernameAvailabilityResponse(BaseModel):
    username: str
    available: bool


class UserProfileData(BaseModel):
    user: UserPrivate


class UserPublicProfileData(BaseModel):
    user: UserPublic
