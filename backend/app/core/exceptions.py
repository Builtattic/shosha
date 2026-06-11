from __future__ import annotations

from typing import NoReturn

from fastapi import HTTPException

_CODE_TO_STATUS: dict[str, int] = {
    "unauthorized": 401,
    "forbidden": 403,
    "not_found": 404,
    "conflict": 409,
    "already_decided": 409,
    "validation_error": 422,
    "no_fields": 422,
    "rate_limited": 429,
    "internal_error": 500,
    "service_unavailable": 503,
    "not_implemented": 501,
}


def raise_api_error(
    code: str,
    message: str,
    *,
    details: dict | None = None,
) -> NoReturn:
    status_code = _CODE_TO_STATUS.get(code, 500)
    payload: dict = {"code": code, "message": message}
    if details is not None:
        payload["details"] = details
    raise HTTPException(status_code=status_code, detail=payload)
