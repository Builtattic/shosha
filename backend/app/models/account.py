from __future__ import annotations

import uuid

from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, BaseModelMixin
from app.models.enums import AccountStatus


class Account(Base, BaseModelMixin):
    __tablename__ = "accounts"

    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    platform: Mapped[str] = mapped_column(String(32), nullable=False)
    handle: Mapped[str] = mapped_column(String(128), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(256), nullable=True)
    bio: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    status: Mapped[AccountStatus] = mapped_column(
        Enum(AccountStatus, name="account_status"),
        nullable=False,
        default=AccountStatus.ACTIVE,
    )
    score: Mapped[float] = mapped_column(Float, nullable=False, default=1000.0)
    score_breakdown: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    w1_delta: Mapped[float | None] = mapped_column(Float, nullable=True)
    w2_delta: Mapped[float | None] = mapped_column(Float, nullable=True)
    w3_delta: Mapped[float | None] = mapped_column(Float, nullable=True)
    momentum_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Workbook profile fields (V1-faithful). Nullable; populated by admin in a
    # future day. Absent values fall back to neutral multipliers (1.0) in
    # scoring_service.profile_multipliers_from_account.
    role: Mapped[str | None] = mapped_column(String(64), nullable=True)
    reach: Mapped[str | None] = mapped_column(String(32), nullable=True)
    education_workbook: Mapped[str | None] = mapped_column(String(64), nullable=True)
    specialized_field_workbook: Mapped[str | None] = mapped_column(String(64), nullable=True)
    management_workbook: Mapped[str | None] = mapped_column(String(64), nullable=True)
    disability: Mapped[str | None] = mapped_column(String(32), nullable=True)
    lifestyle: Mapped[str | None] = mapped_column(String(32), nullable=True)
    region: Mapped[str | None] = mapped_column(String(64), nullable=True)
    opposed_posts: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )

    owner = relationship("User", back_populates="owned_accounts", foreign_keys=[owner_user_id])
    social_links = relationship("AccountSocialLink", back_populates="account", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="account")
    claim_requests = relationship("ClaimRequest", back_populates="account")
    disputes = relationship("Dispute", back_populates="account")
    swipe_records = relationship("SwipeRecord", back_populates="account")

    __table_args__ = (
        UniqueConstraint("platform", "handle", name="uq_accounts_platform_handle"),
        Index("ix_accounts_status", "status"),
    )


class AccountSocialLink(Base, BaseModelMixin):
    __tablename__ = "account_social_links"

    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    platform: Mapped[str] = mapped_column(String(32), nullable=False)
    url: Mapped[str] = mapped_column(String(1024), nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    account = relationship("Account", back_populates="social_links")

    __table_args__ = (
        UniqueConstraint("account_id", "platform", name="uq_account_social_links_account_platform"),
    )
