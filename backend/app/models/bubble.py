from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Index, Integer, String, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, BaseModelMixin
from app.models.enums import BubbleJoinStatus, BubbleMemberRole, BubbleType, BubbleVisibility


class Bubble(Base, BaseModelMixin):
    __tablename__ = "bubbles"

    name: Mapped[str] = mapped_column(String(80), nullable=False)
    tagline: Mapped[str | None] = mapped_column(String(120), nullable=True)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    bubble_type: Mapped[BubbleType] = mapped_column(
        Enum(BubbleType, name="bubble_type"),
        nullable=False,
    )
    category: Mapped[str | None] = mapped_column(String(80), nullable=True)
    cover_image_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    is_admin_created: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    visibility: Mapped[BubbleVisibility] = mapped_column(
        Enum(BubbleVisibility, name="bubble_visibility"),
        nullable=False,
        default=BubbleVisibility.PUBLIC,
    )

    creator = relationship("User", back_populates="bubbles_created", foreign_keys=[created_by])
    members = relationship("BubbleMember", back_populates="bubble", cascade="all, delete-orphan")
    join_requests = relationship("BubbleJoinRequest", back_populates="bubble", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_bubbles_visibility", "visibility"),
    )


class BubbleMember(Base, BaseModelMixin):
    __tablename__ = "bubble_members"

    bubble_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bubbles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    role: Mapped[BubbleMemberRole] = mapped_column(
        Enum(BubbleMemberRole, name="bubble_member_role"),
        nullable=False,
        default=BubbleMemberRole.MEMBER,
    )
    score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    previous_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    bubble = relationship("Bubble", back_populates="members")
    user = relationship("User", back_populates="bubble_memberships")

    __table_args__ = (
        UniqueConstraint("bubble_id", "user_id", name="uq_bubble_members_bubble_user"),
        Index("ix_bubble_members_score", "bubble_id", "score"),
    )


class BubbleJoinRequest(Base, BaseModelMixin):
    __tablename__ = "bubble_join_requests"

    bubble_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bubbles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    status: Mapped[BubbleJoinStatus] = mapped_column(
        Enum(BubbleJoinStatus, name="bubble_join_status"),
        nullable=False,
        default=BubbleJoinStatus.PENDING,
    )
    approvals: Mapped[list] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'[]'::jsonb"),
    )
    rejections: Mapped[list] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'[]'::jsonb"),
    )

    bubble = relationship("Bubble", back_populates="join_requests")
    user = relationship("User", back_populates="bubble_join_requests")

    __table_args__ = (
        UniqueConstraint("bubble_id", "user_id", name="uq_bubble_join_requests_bubble_user"),
        Index("ix_bubble_join_requests_status", "bubble_id", "status"),
    )
