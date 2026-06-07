from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import (
    BubbleJoinStatus,
    BubbleMemberRole,
    BubbleType,
    BubbleVisibility,
)
from app.schemas.common import validate_http_url


class BubbleMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    bubble_id: UUID
    user_id: UUID
    role: BubbleMemberRole
    score: float
    joined_at: datetime


class BubbleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    tagline: str | None
    description: str
    bubble_type: BubbleType
    category: str | None
    cover_image_url: str | None
    image_url: str | None
    created_by: UUID
    is_admin_created: bool
    visibility: BubbleVisibility
    created_at: datetime
    member_count: int = 0


class BubbleDetailOut(BubbleOut):
    members: list[BubbleMemberOut] = Field(default_factory=list)


class BubbleCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    tagline: str | None = Field(default=None, max_length=120)
    description: str = Field(min_length=10, max_length=500)
    bubble_type: BubbleType
    category: str | None = Field(default=None, max_length=80)
    cover_image_url: str | None = Field(default=None, max_length=1024)
    image_url: str | None = Field(default=None, max_length=1024)
    visibility: BubbleVisibility = BubbleVisibility.PUBLIC
    invited_usernames: list[str] = Field(default_factory=list, max_length=25)

    @field_validator("cover_image_url", "image_url")
    @classmethod
    def validate_urls(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return validate_http_url(value)


class JoinRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    bubble_id: UUID
    user_id: UUID
    status: BubbleJoinStatus
    approvals: list[str]
    rejections: list[str]
    created_at: datetime

    @field_validator("approvals", "rejections", mode="before")
    @classmethod
    def normalize_vote_lists(cls, value: object) -> list[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return [str(item) for item in value]
        return []


class VoteRequest(BaseModel):
    vote: Literal["approve", "reject"]
