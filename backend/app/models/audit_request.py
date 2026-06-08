from __future__ import annotations

import uuid

from sqlalchemy import Enum, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BaseModelMixin
from app.models.enums import AuditRequestStatus


class AuditRequest(Base, BaseModelMixin):
    __tablename__ = "audit_requests"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("accounts.id", ondelete="RESTRICT"),
        nullable=False,
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[AuditRequestStatus] = mapped_column(
        Enum(AuditRequestStatus, name="audit_request_status"),
        nullable=False,
        default=AuditRequestStatus.PENDING,
    )

    __table_args__ = (
        Index("ix_audit_requests_account_id", "account_id"),
        Index("ix_audit_requests_status_created", "status", "created_at"),
    )
