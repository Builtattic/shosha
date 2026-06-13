from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Index, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB
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
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    headline: Mapped[str | None] = mapped_column(String(128), nullable=True)
    city: Mapped[str | None] = mapped_column(String(64), nullable=True)
    website_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    dob: Mapped[str | None] = mapped_column(String(16), nullable=True)
    country: Mapped[str | None] = mapped_column(String(64), nullable=True)
    region: Mapped[str | None] = mapped_column(String(64), nullable=True)
    quote: Mapped[str | None] = mapped_column(String(280), nullable=True)
    occupation_role: Mapped[str | None] = mapped_column(String(64), nullable=True)
    network_size: Mapped[str | None] = mapped_column(String(64), nullable=True)
    education: Mapped[str | None] = mapped_column(String(64), nullable=True)
    specialized_field: Mapped[str | None] = mapped_column(String(64), nullable=True)
    manages_money_people_system: Mapped[str | None] = mapped_column(String(64), nullable=True)
    physical_intellectual_limitations: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ig_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    tiktok_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    x_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    reddit_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    yt_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    fb_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    snapchat_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"),
        nullable=False,
        default=UserRole.USER,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    onboarding_complete: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false", default=False
    )
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    trust_badge: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    trust_badge_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    trust_badge_pending: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    trust_badge_submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    trust_badge_selfie_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    trust_badge_doc_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    trust_badge_doc_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    trust_badge_rejected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    trust_badge_rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    trust_badge_subscription_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    trust_badge_payment_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    trust_badge_subscription_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    trust_badge_subscription_currency: Mapped[str | None] = mapped_column(String(8), nullable=True)
    credibility: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0"), default=0
    )
    fcm_tokens: Mapped[list | None] = mapped_column(JSONB, nullable=True)

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
    swipe_records = relationship("SwipeRecord", back_populates="user")
    bubbles_created = relationship("Bubble", back_populates="creator", foreign_keys="Bubble.created_by")
    bubble_memberships = relationship("BubbleMember", back_populates="user")
    bubble_join_requests = relationship("BubbleJoinRequest", back_populates="user")

    __table_args__ = (
        Index("ix_users_role", "role"),
    )
