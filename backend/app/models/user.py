from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, BaseModelMixin
from app.models.enums import UserRole


class User(Base, BaseModelMixin):
    __tablename__ = "users"

    firebase_uid: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True, unique=True)
    username: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True)
    display_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"),
        nullable=False,
        default=UserRole.USER,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    owned_accounts = relationship("Account", back_populates="owner", foreign_keys="Account.owner_user_id")
    reports = relationship("Report", back_populates="reporter", foreign_keys="Report.reporter_user_id")
    reviewed_reports = relationship("Report", back_populates="reviewer", foreign_keys="Report.reviewed_by")
    report_votes = relationship("ReportVote", back_populates="user")
    report_comments = relationship("ReportComment", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    claim_requests = relationship(
        "ClaimRequest",
        back_populates="requester",
        foreign_keys="ClaimRequest.requester_user_id",
    )
    reviewed_claim_requests = relationship("ClaimRequest", back_populates="reviewer", foreign_keys="ClaimRequest.reviewed_by")
    disputes = relationship("Dispute", back_populates="requester", foreign_keys="Dispute.requester_user_id")
    reviewed_disputes = relationship("Dispute", back_populates="reviewer", foreign_keys="Dispute.reviewed_by")
    admin_actions = relationship("AdminAction", back_populates="actor")

    __table_args__ = (
        Index("ix_users_role", "role"),
    )
