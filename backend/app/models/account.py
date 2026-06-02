from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
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

    owner = relationship("User", back_populates="owned_accounts", foreign_keys=[owner_user_id])
    social_links = relationship("AccountSocialLink", back_populates="account", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="account")
    claim_requests = relationship("ClaimRequest", back_populates="account")
    disputes = relationship("Dispute", back_populates="account")

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
