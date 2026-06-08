from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BaseModelMixin


class SiteSetting(Base, BaseModelMixin):
    __tablename__ = "site_settings"

    key: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True, index=True
    )
    value: Mapped[dict] = mapped_column(JSONB, nullable=False)
