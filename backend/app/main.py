from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from pydantic import BaseModel

import app.models  # noqa: F401 — register all models on Base.metadata
from app.api.webhooks import router as webhooks_router
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import engine
from app.core.firebase import _ensure_firebase_initialized, _service_account_info
from app.core.responses import success
from app.models.base import Base
from app.schemas.common import SuccessEnvelope

_DEV_ENVIRONMENTS = frozenset({"development", "dev", "local"})


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.ENVIRONMENT.lower() in _DEV_ENVIRONMENTS:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    if _service_account_info() is not None:
        _ensure_firebase_initialized()
        print(
            f"[shosha] Firebase Admin ready: project={settings.FIREBASE_PROJECT_ID} "
            "(FIREBASE_SERVICE_ACCOUNT_JSON loaded)"
        )
    else:
        print(
            f"[shosha] Firebase Admin: project={settings.FIREBASE_PROJECT_ID} only — "
            "add FIREBASE_SERVICE_ACCOUNT_JSON to root .env for Google sign-in"
        )

    yield


app = FastAPI(
    title="Shosha API",
    lifespan=lifespan,
    openapi_tags=[
        {"name": "auth", "description": "Firebase session sync"},
        {"name": "users", "description": "User profiles and settings"},
        {"name": "accounts", "description": "Account dossiers and social links"},
        {"name": "reports", "description": "Reports, votes, comments, moderation"},
        {"name": "health", "description": "Service health checks"},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")
app.include_router(webhooks_router)

_STATUS_TO_CODE = {
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    409: "conflict",
    422: "validation_error",
    429: "rate_limited",
    500: "internal_error",
}


@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc: Exception):
    import logging

    logging.getLogger(__name__).exception("Unhandled error: %s", exc)
    return JSONResponse(
        status_code=500,
        content={
            "ok": False,
            "error": {
                "code": "internal_error",
                "message": "Internal server error",
                "details": None,
            },
        },
    )


@app.exception_handler(RequestValidationError)
async def request_validation_handler(request, exc: RequestValidationError):
    message = "; ".join(
        f"{'.'.join(str(x) for x in err.get('loc', ()) if x != 'body')}: {err.get('msg', 'invalid')}"
        for err in exc.errors()
    )
    return JSONResponse(
        status_code=422,
        content={
            "ok": False,
            "error": {
                "code": "validation_error",
                "message": message or "Validation failed",
                "details": exc.errors(),
            },
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    if isinstance(exc.detail, dict):
        code = exc.detail.get("code", "internal_error")
        message = exc.detail.get("message", "An error occurred")
        details = exc.detail.get("details")
    else:
        code = _STATUS_TO_CODE.get(exc.status_code, "internal_error")
        message = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
        details = None
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "ok": False,
            "error": {
                "code": code,
                "message": message,
                "details": details,
            },
        },
    )


class HealthData(BaseModel):
    status: str


@app.get("/health", tags=["health"], response_model=SuccessEnvelope[HealthData])
async def health():
    return success({"status": "healthy"})
