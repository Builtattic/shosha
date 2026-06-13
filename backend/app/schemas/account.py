from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import AccountStatus
from app.schemas.common import validate_http_url


class SocialLinkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    platform: str
    url: str
    is_verified: bool


class AccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    platform: str
    handle: str
    display_name: str | None
    bio: str | None
    status: AccountStatus
    owner_user_id: UUID | None
    created_at: datetime
    score: float = 1000.0
    score_breakdown: dict | None = None
    social_links: list[SocialLinkOut] = Field(default_factory=list)
    weekly_delta: float | None = None


class ScoreHistoryPoint(BaseModel):
    t: str
    s: float
    cause: str | None = None


class AccountDetailOut(AccountOut):
    score_history: list[ScoreHistoryPoint] = Field(default_factory=list)
    window_scores: dict = Field(default_factory=dict)
    profile_credibility: int | None = None


class AccountCreateRequest(BaseModel):
    platform: str = Field(max_length=32)
    handle: str = Field(max_length=128)
    display_name: str | None = Field(default=None, max_length=256)
    bio: str | None = Field(default=None, max_length=2000)


class AccountUpdateRequest(BaseModel):
    display_name: str | None = Field(default=None, max_length=256)
    bio: str | None = Field(default=None, max_length=2000)


class SocialLinkCreateRequest(BaseModel):
    platform: str = Field(max_length=32)
    url: str = Field(max_length=1024)
    is_verified: bool = False

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        return validate_http_url(value)


class AccountData(BaseModel):
    account: AccountOut


class AccountDetailData(BaseModel):
    account: AccountDetailOut


class SocialLinksData(BaseModel):
    links: list[SocialLinkOut]


class SocialLinkData(BaseModel):
    link: SocialLinkOut


class AuditCreateRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=2000)
