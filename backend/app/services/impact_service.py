from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import ReportStatus
from app.repositories import account_repository
from app.repositories import ledger_repository
from app.repositories import report_repository


def _serialize_report(report, account) -> dict:
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


async def get_impact(db: AsyncSession) -> dict:
    reports, _ = await report_repository.list_reports(
        db,
        account_id=None,
        status=ReportStatus.APPROVED,
        limit=200,
        cursor=None,
    )

    enriched = []
    for report in reports:
        account = await account_repository.get_by_id(db, report.account_id)
        enriched.append(_serialize_report(report, account))

    top_stories = sorted(
        enriched,
        key=lambda r: r.get("base_score") or 0,
        reverse=True,
    )[:10]
    recent_reports = sorted(
        enriched,
        key=lambda r: r["created_at"],
        reverse=True,
    )[:20]

    return {"top_stories": top_stories, "recent_reports": recent_reports}


async def get_rising_makers(db: AsyncSession) -> list[dict]:
    accounts = await account_repository.list_top_accounts(db, limit=50)
    since = datetime.now(timezone.utc) - timedelta(days=7)

    candidates = []
    for account in accounts:
        entries = await ledger_repository.list_for_account(db, account.id, limit=100)
        weekly_delta = sum(
            e.delta for e in entries if e.timestamp and e.timestamp >= since
        )
        if weekly_delta > 0:
            candidates.append(
                {
                    "id": str(account.id),
                    "display_name": account.display_name,
                    "handle": account.handle,
                    "platform": account.platform,
                    "score": account.score,
                    "weekly_delta": round(weekly_delta, 2),
                }
            )

    candidates.sort(key=lambda c: c["weekly_delta"], reverse=True)
    return candidates[:8]
