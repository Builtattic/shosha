from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Index, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BaseModelMixin
from app.models.enums import ReportStatus


class Event(Base, BaseModelMixin):
    __tablename__ = "events"

    subject_account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("accounts.id", ondelete="RESTRICT"),
        nullable=False,
    )
    reporter_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    anonymous_tag: Mapped[str | None] = mapped_column(String(64), nullable=True)
    event_type: Mapped[str] = mapped_column(String(16), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    base_impact_key: Mapped[str | None] = mapped_column(String(128), nullable=True)
    base_impact: Mapped[float | None] = mapped_column(Float, nullable=True)
    multipliers: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    multiplier_quotient: Mapped[float | None] = mapped_column(Float, nullable=True)
    delta: Mapped[float | None] = mapped_column(Float, nullable=True)
    score_before: Mapped[float | None] = mapped_column(Float, nullable=True)
    score_after: Mapped[float | None] = mapped_column(Float, nullable=True)
    decay: Mapped[float | None] = mapped_column(Float, nullable=True)
    category: Mapped[str | None] = mapped_column(String(128), nullable=True)
    deed: Mapped[str | None] = mapped_column(String(128), nullable=True)
    week_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    formula_version: Mapped[str | None] = mapped_column(String(32), nullable=True)
    proof_links: Mapped[list | None] = mapped_column(
        JSONB, nullable=True, server_default=text("'[]'::jsonb")
    )
    status: Mapped[ReportStatus] = mapped_column(
        Enum(ReportStatus, name="report_status"),
        nullable=False,
        default=ReportStatus.PENDING,
    )
    ai_verdict: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    admin_decision: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    stats: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
        server_default=text('\'{"aligns"\\:0,"opposes"\\:0,"comments"\\:0,"shares"\\:0}\'::jsonb'),
    )

    __table_args__ = (
        Index("ix_events_subject_account_id", "subject_account_id"),
        Index("ix_events_reporter_user_id", "reporter_user_id"),
        Index("ix_events_status_created", "status", "created_at"),
    )
