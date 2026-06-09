from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user_optional
from app.core.exceptions import raise_api_error
from app.core.responses import success
from app.models.user import User
from app.repositories import account_repository, report_repository
from app.services import stats_service

router = APIRouter()


def _serialize_search_report(report, account) -> dict:
    return {
        "id": str(report.id),
        "title": report.title,
        "description": report.description,
        "deed": report.deed,
        "base_score": report.base_score,
        "status": report.status.value,
        "created_at": report.created_at.isoformat(),
        "account": (
            {
                "id": str(account.id),
                "handle": account.handle,
                "platform": account.platform,
                "display_name": account.display_name,
                "score": account.score,
            }
            if account is not None
            else None
        ),
    }


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
):
    result = await stats_service.get_public_stats(db)
    return success(result)


@router.get("/search/reports")
async def search_reports(
    q: str = Query(...),
    limit: int = Query(default=30, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    del current_user
    if not q.strip():
        raise_api_error("validation_error", "Search query required")

    matches = await report_repository.search_reports(db, q, limit)
    reports = []
    for report in matches:
        account = await account_repository.get_by_id(db, report.account_id)
        reports.append(_serialize_search_report(report, account))
    return success({"reports": reports})
