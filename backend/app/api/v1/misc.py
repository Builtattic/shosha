from __future__ import annotations

from io import BytesIO
from urllib.parse import urlparse
from uuid import UUID

import httpx
from fastapi import APIRouter, Body, Depends, Query
from fastapi.responses import Response
from PIL import Image, ImageDraw, ImageFont
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_user_optional
from app.core.exceptions import raise_api_error
from app.core.responses import success
from app.models.user import User
from app.repositories import account_repository, user_repository
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


def _score_color(score: float) -> str:
    if score >= 1200:
        return "#16a34a"
    if score >= 800:
        return "#ca8a04"
    return "#dc2626"


def _render_og_image(display_name: str, score: float) -> bytes:
    width, height = 1200, 630
    img = Image.new("RGB", (width, height), "#0f0f0f")
    draw = ImageDraw.Draw(img)
    color = _score_color(score)

    try:
        title_font = ImageFont.truetype("arial.ttf", 48)
        score_font = ImageFont.truetype("arial.ttf", 96)
        small_font = ImageFont.truetype("arial.ttf", 28)
    except OSError:
        title_font = ImageFont.load_default()
        score_font = ImageFont.load_default()
        small_font = ImageFont.load_default()

    draw.text((64, 48), "Shosha™ · The Ledger", fill="#ffffff", font=small_font)
    draw.text((64, 220), display_name[:60], fill="#ffffff", font=title_font)
    draw.text((64, 320), "Shosha Score", fill="#9ca3af", font=small_font)
    draw.text((64, 360), f"{int(score):,}", fill=color, font=score_font)
    draw.text((64, 560), "noshosha.com", fill="#6b7280", font=small_font)

    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@router.get("/og")
async def get_og_image(
    id: str = Query(..., alias="id"),
    db: AsyncSession = Depends(get_db),
):
    """Public OG image for account sharing (no auth — crawlers/unfurlers)."""
    try:
        account_id = UUID(id)
    except ValueError:
        raise_api_error("validation_error", "Invalid account id")

    account = await account_repository.get_by_id(db, account_id)
    if account is None:
        raise_api_error("not_found", "Account not found")

    display_name = account.display_name or account.handle
    png = _render_og_image(display_name, account.score)
    return Response(content=png, media_type="image/png")


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
