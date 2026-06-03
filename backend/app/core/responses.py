from __future__ import annotations

from fastapi.responses import JSONResponse


def success(data: dict) -> dict:
    return {"ok": True, "data": data}


def error(
    code: str,
    message: str,
    status_code: int,
    details: dict | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "ok": False,
            "error": {
                "code": code,
                "message": message,
                "details": details,
            },
        },
    )
