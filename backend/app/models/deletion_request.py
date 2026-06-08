from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BaseModelMixin
from app.models.enums import DeletionRequestStatus


class DeletionRequest(Base, BaseModelMixin):
    __tablename__ = "deletion_requests"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_snapshot: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    attachment_urls: Mapped[list | None] = mapped_column(
        JSONB, nullable=True, server_default=text("'[]'::jsonb")
    )
    status: Mapped[DeletionRequestStatus] = mapped_column(
        Enum(DeletionRequestStatus, name="deletion_request_status"),
        nullable=False,
        default=DeletionRequestStatus.PENDING,
    )
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_deletion_requests_user_id", "user_id"),
        Index("ix_deletion_requests_status_created", "status", "created_at"),
    )
