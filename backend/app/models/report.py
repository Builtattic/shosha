from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, BaseModelMixin
from app.models.enums import ReportStatus, VoteType


class Report(Base, BaseModelMixin):
    __tablename__ = "reports"

    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("accounts.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    reporter_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    status: Mapped[ReportStatus] = mapped_column(
        Enum(ReportStatus, name="report_status"),
        nullable=False,
        default=ReportStatus.PENDING,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    report_type: Mapped[str | None] = mapped_column(String(16), nullable=True)
    is_irl: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    evidence_source_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    deed: Mapped[str | None] = mapped_column(String(256), nullable=True)
    base_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    ai_verdict: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    account = relationship("Account", back_populates="reports")
    reporter = relationship("User", back_populates="reports", foreign_keys=[reporter_user_id])
    reviewer = relationship("User", back_populates="reviewed_reports", foreign_keys=[reviewed_by])
    media_items = relationship("ReportMedia", back_populates="report", cascade="all, delete-orphan")
    votes = relationship("ReportVote", back_populates="report", cascade="all, delete-orphan")
    comments = relationship("ReportComment", back_populates="report", cascade="all, delete-orphan")
    disputes = relationship("Dispute", back_populates="report")

    __table_args__ = (
        Index("ix_reports_account_created", "account_id", "created_at"),
        Index("ix_reports_status_created", "status", "created_at"),
        Index("ix_reports_reviewer_reviewed_at", "reviewed_by", "reviewed_at"),
    )


class ReportMedia(Base, BaseModelMixin):
    __tablename__ = "report_media"

    report_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("reports.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    media_type: Mapped[str] = mapped_column(String(32), nullable=False)
    url: Mapped[str] = mapped_column(String(1024), nullable=False)
    thumbnail_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    report = relationship("Report", back_populates="media_items")


class ReportVote(Base, BaseModelMixin):
    __tablename__ = "report_votes"

    report_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("reports.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    vote_type: Mapped[VoteType] = mapped_column(Enum(VoteType, name="vote_type"), nullable=False)

    report = relationship("Report", back_populates="votes")
    user = relationship("User", back_populates="report_votes")

    __table_args__ = (
        UniqueConstraint("report_id", "user_id", name="uq_report_votes_report_user"),
    )


class ReportComment(Base, BaseModelMixin):
    __tablename__ = "report_comments"

    report_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("reports.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)

    report = relationship("Report", back_populates="comments")
    user = relationship("User", back_populates="report_comments")
