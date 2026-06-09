from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BaseModelMixin


class UserFollow(Base, BaseModelMixin):
    __tablename__ = "user_follows"

    follower_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    following_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    __table_args__ = (
        UniqueConstraint("follower_id", "following_id", name="uq_user_follows"),
        Index("ix_user_follows_follower", "follower_id", "created_at"),
        Index("ix_user_follows_following", "following_id", "created_at"),
    )
