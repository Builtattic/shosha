from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin
from app.core.ratelimit import (
    check_rate_limit,
    get_ai_analyze_limiter,
    get_ai_classify_limiter,
)
from app.core.responses import success
from app.integrations.gemini import adjudicate_report, verdict_to_dict
from app.models.user import User
from app.services import classify_service

router = APIRouter()


class AIAnalyzeRequest(BaseModel):
    account_id: UUID | None = None
    account_display_name: str | None = None
    platform: str | None = None
    type: str
    description: str = Field(..., min_length=10, max_length=500)
    feelings: str = "Published by Shosha."
    media_url: str | None = None
    media_type: str | None = None


class AIClassifyRequest(BaseModel):
    description: str = Field(..., min_length=10, max_length=500)
    gemini_api_key: str | None = None


@router.post("/ai/analyze")
async def post_ai_analyze(
    data: AIAnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    await check_rate_limit(
        f"ai:analyze:{current_user.id}",
        get_ai_analyze_limiter(),
    )
    del db
    verdict = await adjudicate_report(
        description=data.description,
        report_type=data.type,
        account_display_name=data.account_display_name or "Unknown account",
        platform=data.platform or "unknown",
        media_url=data.media_url,
        media_type=data.media_type,
    )
    return success({"verdict": verdict_to_dict(verdict)})


@router.post("/ai/classify")
async def post_ai_classify(
    data: AIClassifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await check_rate_limit(
        f"ai:classify:{current_user.id}",
        get_ai_classify_limiter(),
    )
    result = await classify_service.classify_report(
        db, data.description, data.gemini_api_key
    )
    return success(result)
