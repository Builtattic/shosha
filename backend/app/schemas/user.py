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
    bio: str | None = None
    headline: str | None = None
    city: str | None = None
    website_url: str | None = None
    role: UserRole
    created_at: datetime


class UserPrivate(UserPublic):
    email: str | None
    is_active: bool
    last_login_at: datetime | None
    trust_badge: bool | None = None
    trust_badge_pending: bool | None = None
    trust_badge_at: datetime | None = None
    trust_badge_submitted_at: datetime | None = None
    trust_badge_rejected_at: datetime | None = None
    trust_badge_rejection_reason: str | None = None
    trust_badge_doc_type: str | None = None


class UserUpdateRequest(BaseModel):
    username: str | None = Field(
        default=None,
        min_length=3,
        max_length=64,
        pattern=_USERNAME_PATTERN,
    )
    display_name: str | None = Field(default=None, max_length=128)
    photo_url: str | None = Field(default=None, max_length=1024)
    bio: str | None = Field(default=None, max_length=500)
    headline: str | None = Field(default=None, max_length=128)
    city: str | None = Field(default=None, max_length=64)
    website_url: str | None = Field(default=None, max_length=1024)

    @field_validator("photo_url", "website_url")
    @classmethod
    def validate_http_fields(cls, value: str | None) -> str | None:
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
