from __future__ import annotations

from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Body, Depends, Query
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_user_optional
from app.core.exceptions import raise_api_error
from app.core.responses import success
from app.models.user import User
from app.repositories import user_repository
from app.services import issue_report_service

router = APIRouter()

ALLOWED_PROXY_HOSTS = {
    "pbs.twimg.com",
    "abs.twimg.com",
    "instagram.com",
    "cdninstagram.com",
    "fbcdn.net",
    "images.unsplash.com",
    "lh3.googleusercontent.com",
    "storage.googleapis.com",
    "firebasestorage.googleapis.com",
    "yt3.ggpht.com",
    "i.imgur.com",
}


class ReportIssueRequest(BaseModel):
    name: str
    email: str
    issue_type: str
    page: str
    title: str
    details: str
    attachment_urls: list[str] = Field(default_factory=list)
    device: str | None = None
    browser: str | None = None
    severity: str | None = None


class FCMTokenRequest(BaseModel):
    token: str


def _host_allowed(hostname: str) -> bool:
    host = hostname.lower()
    if host in ALLOWED_PROXY_HOSTS:
        return True
    return any(host.endswith(f".{allowed}") for allowed in ALLOWED_PROXY_HOSTS)


@router.post("/report-issue")
async def post_report_issue(
    data: ReportIssueRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    issue = await issue_report_service.create_issue_report(
        db,
        submitted_by=current_user.id if current_user else None,
        name=data.name,
        email=data.email,
        issue_type=data.issue_type,
        page=data.page,
        title=data.title,
        details=data.details,
        attachment_urls=data.attachment_urls,
        device=data.device,
        browser=data.browser,
        severity=data.severity,
    )
    return success({"success": True, "report_id": str(issue.id)})


@router.get("/proxy-image")
async def get_proxy_image(
    url: str = Query(...),
):
    if not url.startswith("https://"):
        raise_api_error("validation_error", "URL must use HTTPS")

    parsed = urlparse(url)
    if not parsed.hostname or not _host_allowed(parsed.hostname):
        raise_api_error("forbidden", "Image host not allowed")

    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.get(url)

    content_type = response.headers.get("content-type", "")
    if not content_type.lower().startswith("image/"):
        raise_api_error("validation_error", "URL does not point to an image")

    return Response(content=response.content, media_type=content_type)


@router.post("/notifications/token")
async def post_notification_token(
    data: FCMTokenRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = await user_repository.get_by_id(db, current_user.id)
    if user is None:
        raise_api_error("not_found", "User not found")

    tokens = list(user.fcm_tokens or [])
    if data.token not in tokens:
        tokens.append(data.token)
        await user_repository.update(db, user, fcm_tokens=tokens)
        await db.commit()
    return success({"message": "Token registered"})


@router.delete("/notifications/token")
async def delete_notification_token(
    data: FCMTokenRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = await user_repository.get_by_id(db, current_user.id)
    if user is None:
        raise_api_error("not_found", "User not found")

    tokens = [t for t in (user.fcm_tokens or []) if t != data.token]
    await user_repository.update(db, user, fcm_tokens=tokens)
    await db.commit()
    return success({"message": "Token unregistered"})
