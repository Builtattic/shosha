from __future__ import annotations

from typing import Any, Generic, Literal, TypeVar

from pydantic import BaseModel, HttpUrl, TypeAdapter

T = TypeVar("T")


class SuccessEnvelope(BaseModel, Generic[T]):
    ok: Literal[True] = True
    data: T

_http_url_adapter = TypeAdapter(HttpUrl)


def validate_http_url(value: str) -> str:
    _http_url_adapter.validate_python(value)
    return value


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    next_cursor: str | None = None


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, Any] | None = None
