from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, BaseModelMixin


class LedgerEntry(Base, BaseModelMixin):
    __tablename__ = "ledger_entries"

    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("accounts.id", ondelete="RESTRICT"),
        nullable=False,
    )
    report_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("reports.id", ondelete="RESTRICT"),
        nullable=True,
    )
    delta: Mapped[float] = mapped_column(Float, nullable=False)
    base_score: Mapped[float] = mapped_column(Float, nullable=False)
    multiplier_quotient: Mapped[float] = mapped_column(Float, nullable=False)
    multipliers: Mapped[dict] = mapped_column(JSONB, nullable=False)
    formula_version: Mapped[str] = mapped_column(
        String(32), nullable=False, default="workbook-v1"
    )
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    category: Mapped[str | None] = mapped_column(String(128), nullable=True)
    deed: Mapped[str | None] = mapped_column(String(256), nullable=True)
    capped: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    cause: Mapped[str] = mapped_column(String(32), nullable=False, default="report")

    account = relationship("Account")
    report = relationship("Report")

    __table_args__ = (
        Index("ix_ledger_entries_account_id_timestamp", "account_id", "timestamp"),
        Index("ix_ledger_entries_report_id", "report_id"),
    )
