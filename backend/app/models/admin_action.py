from __future__ import annotations

import uuid

from sqlalchemy import Enum, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, BaseModelMixin
from app.models.enums import AdminActionType


class AdminAction(Base, BaseModelMixin):
    __tablename__ = "admin_actions"

    actor_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    action_type: Mapped[AdminActionType] = mapped_column(
        Enum(AdminActionType, name="admin_action_type"),
        nullable=False,
    )
    target_type: Mapped[str] = mapped_column(String(64), nullable=False)
    target_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    actor = relationship("User", back_populates="admin_actions")

    __table_args__ = (
        Index("ix_admin_actions_target", "target_type", "target_id"),
        Index("ix_admin_actions_actor_created", "actor_user_id", "created_at"),
    )
