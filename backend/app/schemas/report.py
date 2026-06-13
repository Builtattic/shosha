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
    deed: str | None = None
    base_score: float | None = None
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


class FeedReportOut(ReportOut):
    align_count: int = 0
    oppose_count: int = 0
    comment_count: int = 0
    viewer_vote: VoteType | None = None


class FeedListData(BaseModel):
    items: list[FeedReportOut]
    next_cursor: str | None = None
    empty_reason: str | None = None


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


_WORKBOOK_SCALE = frozenset({0.5, 1.0, 1.5, 2.0, 2.5, 3.0})


class ModerationDecisionRequest(BaseModel):
    decision: ReportStatus
    note: str | None = Field(default=None, max_length=500)
    category: str | None = Field(default=None, max_length=120)
    deed: str | None = Field(default=None, max_length=160)
    base_score: float | None = None
    repetition_pattern: float | None = None
    intent: float | None = None
    circumstances: float | None = None
    final_impact: float | None = None

    @field_validator("decision")
    @classmethod
    def validate_decision(cls, value: ReportStatus) -> ReportStatus:
        if value not in _MODERATION_DECISIONS:
            raise ValueError("decision must be APPROVED, REJECTED, or REMOVED")
        return value

    @field_validator("repetition_pattern", "intent", "circumstances")
    @classmethod
    def validate_workbook_scale(cls, value: float | None) -> float | None:
        if value is not None and value not in _WORKBOOK_SCALE:
            raise ValueError(
                "must be one of the workbook scale values: 0.5, 1, 1.5, 2, 2.5, 3"
            )
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
