from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Index, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BaseModelMixin
from app.models.enums import EvidenceProposalStatus


class EvidenceProposal(Base, BaseModelMixin):
    __tablename__ = "evidence_proposals"

    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("accounts.id", ondelete="RESTRICT"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    scoring_deed: Mapped[str | None] = mapped_column(String(128), nullable=True)
    report_type: Mapped[str | None] = mapped_column(String(16), nullable=True)
    scoring_category: Mapped[str | None] = mapped_column(String(128), nullable=True)
    base_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    suggested_impact: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    source_urls: Mapped[list | None] = mapped_column(
        JSONB, nullable=True, server_default=text("'[]'::jsonb")
    )
    source_titles: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    event_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[EvidenceProposalStatus] = mapped_column(
        Enum(EvidenceProposalStatus, name="evidence_proposal_status"),
        nullable=False,
        default=EvidenceProposalStatus.PENDING,
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    report_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("reports.id", ondelete="SET NULL"),
        nullable=True,
    )
    event_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("events.id", ondelete="SET NULL"),
        nullable=True,
    )
    reporter_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_by_admin_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    anonymous_tag: Mapped[str | None] = mapped_column(String(64), nullable=True)
    public_anonymous: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)

    __table_args__ = (
        Index("ix_evidence_proposals_account_id", "account_id"),
        Index("ix_evidence_proposals_status_created", "status", "created_at"),
    )
