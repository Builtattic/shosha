from __future__ import annotations

import uuid

from sqlalchemy import Enum, ForeignKey, Index, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BaseModelMixin
from app.models.enums import IssueReportStatus


class IssueReport(Base, BaseModelMixin):
    __tablename__ = "issue_reports"

    name: Mapped[str] = mapped_column(String(128), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    issue_type: Mapped[str] = mapped_column(String(64), nullable=False)
    page: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    details: Mapped[str] = mapped_column(Text, nullable=False)
    attachment_urls: Mapped[list | None] = mapped_column(
        JSONB, nullable=True, server_default=text("'[]'::jsonb")
    )
    device: Mapped[str | None] = mapped_column(String(128), nullable=True)
    browser: Mapped[str | None] = mapped_column(String(128), nullable=True)
    severity: Mapped[str | None] = mapped_column(String(32), nullable=True)
    status: Mapped[IssueReportStatus] = mapped_column(
        Enum(IssueReportStatus, name="issue_report_status"),
        nullable=False,
        default=IssueReportStatus.OPEN,
    )
    submitted_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    __table_args__ = (
        Index("ix_issue_reports_status_created", "status", "created_at"),
    )
