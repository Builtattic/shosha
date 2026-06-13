from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import UserRole
from app.schemas.common import validate_http_url


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
    country: str | None = None
    quote: str | None = None
    occupation_role: str | None = None
    network_size: str | None = None
    education: str | None = None
    specialized_field: str | None = None
    manages_money_people_system: str | None = None
    physical_intellectual_limitations: str | None = None
    ig_url: str | None = None
    tiktok_url: str | None = None
    x_url: str | None = None
    linkedin_url: str | None = None
    reddit_url: str | None = None
    yt_url: str | None = None
    fb_url: str | None = None
    snapchat_url: str | None = None
    role: UserRole
    onboarding_complete: bool = False
    created_at: datetime
    followers_count: int = 0
    following_count: int = 0


class UserPrivate(UserPublic):
    email: str | None
    is_active: bool
    last_login_at: datetime | None
    # Private profile fields (not exposed on UserPublic).
    phone: str | None = None
    dob: str | None = None
    region: str | None = None
    trust_badge: bool | None = None
    trust_badge_pending: bool | None = None
    trust_badge_at: datetime | None = None
    trust_badge_submitted_at: datetime | None = None
    trust_badge_rejected_at: datetime | None = None
    trust_badge_rejection_reason: str | None = None
    trust_badge_doc_type: str | None = None
    credibility: int = 0
    profile_credibility: int = 0


class UserUpdateRequest(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=64)
    display_name: str | None = Field(default=None, max_length=128)
    photo_url: str | None = Field(default=None, max_length=1024)
    bio: str | None = Field(default=None, max_length=500)
    headline: str | None = Field(default=None, max_length=128)
    city: str | None = Field(default=None, max_length=64)
    website_url: str | None = Field(default=None, max_length=1024)
    phone: str | None = Field(default=None, max_length=32)
    dob: str | None = Field(default=None, max_length=16)
    country: str | None = Field(default=None, max_length=64)
    region: str | None = Field(default=None, max_length=64)
    quote: str | None = Field(default=None, max_length=280)
    # The 6 select fields store V1 slug strings as-is (no enum validation).
    occupation_role: str | None = Field(default=None, max_length=64)
    # Valid V1 values: student, unemployed, individual_contributor, manager,
    # founder_business_owner, public_figure_influencer, government_political
    network_size: str | None = Field(default=None, max_length=64)
    # Valid V1 values: none, <1k, 1k-10k, 10k-100k, 100k-1m, 1m-100m, 100m+
    education: str | None = Field(default=None, max_length=64)
    # Valid V1 values: no_formal, school, undergraduate, postgraduate, doctorate_specialized
    specialized_field: str | None = Field(default=None, max_length=64)
    # Valid V1 values: no, some_experience, professional, expert
    manages_money_people_system: str | None = Field(default=None, max_length=64)
    # Valid V1 values: none, small_team_limited_control, moderate_responsibility,
    # large_team_major_decisions, organizational_institutional
    physical_intellectual_limitations: str | None = Field(default=None, max_length=64)
    # Valid V1 values: yes, no, prefer_not_to_say
    ig_url: str | None = Field(default=None, max_length=512)
    tiktok_url: str | None = Field(default=None, max_length=512)
    x_url: str | None = Field(default=None, max_length=512)
    linkedin_url: str | None = Field(default=None, max_length=512)
    reddit_url: str | None = Field(default=None, max_length=512)
    yt_url: str | None = Field(default=None, max_length=512)
    fb_url: str | None = Field(default=None, max_length=512)
    snapchat_url: str | None = Field(default=None, max_length=512)
    onboarding_complete: bool | None = None

    @field_validator("username", mode="before")
    @classmethod
    def validate_username_field(cls, value: str | None) -> str | None:
        if value is None:
            return value
        # Mirror validate_username_format in app.services._helpers exactly, using
        # the SAME compiled regex objects (local import avoids a circular import:
        # the services package imports this schema module).
        from app.services._helpers import (
            _ADJACENT_SPECIAL,
            _CONSECUTIVE_SPECIAL,
            _USERNAME_PATTERN,
        )

        if len(value) < 3:
            raise ValueError("Username must be at least 3 characters")
        if len(value) > 64:
            raise ValueError("Username must be at most 64 characters")
        if not _USERNAME_PATTERN.match(value):
            raise ValueError(
                "Username can only contain letters, numbers, underscores, and periods"
            )
        if _CONSECUTIVE_SPECIAL.search(value) or _ADJACENT_SPECIAL.search(value):
            raise ValueError("Username cannot have consecutive special characters")
        return value

    @field_validator(
        "photo_url",
        "website_url",
        "ig_url",
        "tiktok_url",
        "x_url",
        "linkedin_url",
        "reddit_url",
        "yt_url",
        "fb_url",
        "snapchat_url",
    )
    @classmethod
    def validate_http_fields(cls, value: str | None) -> str | None:
        # Allow None and "" so a previously-set URL can be explicitly cleared.
        if value is None or value == "":
            return value
        return validate_http_url(value)


class UsernameAvailabilityResponse(BaseModel):
    username: str
    available: bool


class UserProfileData(BaseModel):
    user: UserPrivate


class UserPublicProfileData(BaseModel):
    user: UserPublic
