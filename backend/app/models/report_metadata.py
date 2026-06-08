from __future__ import annotations

import uuid

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BaseModelMixin


class ReportMetadata(Base, BaseModelMixin):
    __tablename__ = "report_metadata"

    report_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("reports.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("accounts.id", ondelete="RESTRICT"),
        nullable=False,
    )
    multipliers: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    labels: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    source_fields: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    admin_overrides: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    multiplier_quotient: Mapped[float | None] = mapped_column(Float, nullable=True)
    formula_version: Mapped[str | None] = mapped_column(String(32), nullable=True)
