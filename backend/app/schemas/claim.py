from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import ClaimRequestStatus

_DECISION_STATUSES = frozenset({ClaimRequestStatus.APPROVED, ClaimRequestStatus.REJECTED})


class ClaimOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    account_id: UUID
    requester_user_id: UUID
    status: ClaimRequestStatus
    evidence_type: str | None
    evidence_payload: dict | None
    reviewed_by: UUID | None
    reviewed_at: datetime | None
    created_at: datetime


class ClaimCreateRequest(BaseModel):
    account_id: UUID
    evidence_type: str | None = Field(default=None, max_length=64)
    evidence_payload: dict | None = None


class ClaimDecisionRequest(BaseModel):
    decision: ClaimRequestStatus
    note: str | None = None

    @field_validator("decision")
    @classmethod
    def validate_decision(cls, value: ClaimRequestStatus) -> ClaimRequestStatus:
        if value not in _DECISION_STATUSES:
            raise ValueError("decision must be APPROVED or REJECTED")
        return value
