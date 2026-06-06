from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import DisputeStatus
from app.schemas.common import validate_http_url

_DECISION_STATUSES = frozenset({DisputeStatus.ACCEPTED, DisputeStatus.REJECTED})


class DisputeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    report_id: UUID
    account_id: UUID
    requester_user_id: UUID
    status: DisputeStatus
    reason: str
    evidence_url: str | None
    reviewed_by: UUID | None
    reviewed_at: datetime | None
    created_at: datetime


class DisputeCreateRequest(BaseModel):
    report_id: UUID
    account_id: UUID
    reason: str = Field(min_length=10, max_length=1000)
    evidence_url: str | None = Field(default=None, max_length=1024)

    @field_validator("evidence_url")
    @classmethod
    def validate_evidence_url(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return validate_http_url(value)


class DisputeDecisionRequest(BaseModel):
    decision: DisputeStatus
    note: str | None = None

    @field_validator("decision")
    @classmethod
    def validate_decision(cls, value: DisputeStatus) -> DisputeStatus:
        if value not in _DECISION_STATUSES:
            raise ValueError("decision must be ACCEPTED or REJECTED")
        return value
