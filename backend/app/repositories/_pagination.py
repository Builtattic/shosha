from __future__ import annotations

import base64
from datetime import datetime
from typing import Any, TypeVar

from sqlalchemy import ColumnElement, Select

T = TypeVar("T")


def encode_cursor(created_at: datetime) -> str:
    return base64.urlsafe_b64encode(created_at.isoformat().encode()).decode()


def decode_cursor(cursor: str | None) -> datetime | None:
    if not cursor:
        return None
    try:
        raw = base64.urlsafe_b64decode(cursor.encode())
        return datetime.fromisoformat(raw.decode())
    except (ValueError, OSError):
        return None


def apply_created_at_cursor(
    stmt: Select[Any],
    created_at_col: ColumnElement[datetime],
    cursor_dt: datetime | None,
    *,
    descending: bool,
) -> Select[Any]:
    if cursor_dt is None:
        return stmt
    if descending:
        return stmt.where(created_at_col < cursor_dt)
    return stmt.where(created_at_col > cursor_dt)


def build_next_cursor(items: list[T], limit: int) -> tuple[list[T], str | None]:
    if len(items) > limit:
        page = items[:limit]
        return page, encode_cursor(page[-1].created_at)
    return items, None
