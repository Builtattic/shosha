from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import ReportStatus, VoteType
from app.schemas.common import validate_http_url

_MODERATION_DECISIONS = frozenset(
    {ReportStatus.APPROVED, ReportStatus.REJECTED, ReportStatus.REMOVED}
)


class ReportMediaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    media_type: str
    url: str
    thumbnail_url: str | None


class AccountSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    platform: str
    handle: str
    display_name: str | None
    score: float = 1000.0


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: UUID
    account_id: UUID
    reporter_user_id: UUID | None
    status: ReportStatus
    title: str
    description: str
    type: Literal["positive", "negative"] | None = Field(
        default=None, validation_alias="report_type"
    )
    is_irl: bool = False
    evidence_source_url: str | None = None
    ai_verdict: dict | None = None
    reviewed_by: UUID | None
    reviewed_at: datetime | None
    created_at: datetime
    media_items: list[ReportMediaOut] = Field(default_factory=list)
    account: AccountSummary | None = None


class ReportMediaCreate(BaseModel):
    media_type: str = Field(max_length=32)
    url: str = Field(max_length=1024)
    thumbnail_url: str | None = Field(default=None, max_length=1024)

    @field_validator("url", "thumbnail_url")
    @classmethod
    def validate_urls(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return validate_http_url(value)


class ReportCreateRequest(BaseModel):
    account_id: UUID
    title: str = Field(max_length=255)
    description: str = Field(min_length=1)
    type: Literal["positive", "negative"]
    is_irl: bool = False
    evidence_source_url: str | None = Field(default=None, max_length=1024)
    media: list[ReportMediaCreate] = Field(default_factory=list)

    @field_validator("evidence_source_url")
    @classmethod
    def validate_evidence_source_url(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return validate_http_url(value)


class VoteRequest(BaseModel):
    vote_type: VoteType


class VoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    report_id: UUID
    user_id: UUID
    vote_type: VoteType


class VoteAggregates(BaseModel):
    align_count: int
    oppose_count: int


class VoteResponse(BaseModel):
    vote: VoteOut
    aggregates: VoteAggregates


class CommentCreateRequest(BaseModel):
    body: str = Field(min_length=1)


class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    report_id: UUID
    user_id: UUID
    body: str
    created_at: datetime


class ModerationDecisionRequest(BaseModel):
    decision: ReportStatus
    note: str | None = None

    @field_validator("decision")
    @classmethod
    def validate_decision(cls, value: ReportStatus) -> ReportStatus:
        if value not in _MODERATION_DECISIONS:
            raise ValueError("decision must be APPROVED, REJECTED, or REMOVED")
        return value


class ModerationRequestRequest(BaseModel):
    reason: str | None = None
    evidence_url: str | None = Field(default=None, max_length=1024)

    @field_validator("evidence_url")
    @classmethod
    def validate_evidence_url(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return validate_http_url(value)


class ReportData(BaseModel):
    report: ReportOut


class CommentData(BaseModel):
    comment: CommentOut


class ModerationRequestData(BaseModel):
    queued: bool
    report_status: ReportStatus
