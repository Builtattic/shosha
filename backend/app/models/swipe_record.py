from __future__ import annotations

import uuid

from sqlalchemy import Enum, Float, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, BaseModelMixin
from app.models.enums import SwipeDirection


class SwipeRecord(Base, BaseModelMixin):
    __tablename__ = "swipe_records"

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
        index=True,
    )
    direction: Mapped[SwipeDirection] = mapped_column(
        Enum(SwipeDirection, name="swipe_direction"),
        nullable=False,
    )
    delta: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    user = relationship("User", back_populates="swipe_records")
    account = relationship("Account", back_populates="swipe_records")

    __table_args__ = (
        UniqueConstraint("user_id", "account_id", name="uq_swipe_records_user_account"),
        Index("ix_swipe_records_user_created", "user_id", "created_at"),
    )
