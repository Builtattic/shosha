from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, BaseModelMixin
from app.models.enums import ClaimRequestStatus


class ClaimRequest(Base, BaseModelMixin):
    __tablename__ = "claim_requests"

    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("accounts.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    requester_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    status: Mapped[ClaimRequestStatus] = mapped_column(
        Enum(ClaimRequestStatus, name="claim_request_status"),
        nullable=False,
        default=ClaimRequestStatus.PENDING,
    )
    evidence_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    evidence_payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    account = relationship("Account", back_populates="claim_requests")
    requester = relationship("User", back_populates="claim_requests", foreign_keys=[requester_user_id])
    reviewer = relationship("User", back_populates="reviewed_claim_requests", foreign_keys=[reviewed_by])

    __table_args__ = (
        UniqueConstraint("account_id", "requester_user_id", name="uq_claim_requests_account_requester"),
        Index("ix_claim_requests_status_created", "status", "created_at"),
    )
