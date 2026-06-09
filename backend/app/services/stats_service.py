from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories import account_repository
from app.repositories import report_repository


async def get_public_stats(db: AsyncSession) -> dict:
    now = datetime.now(timezone.utc)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    seven_days_ago = now - timedelta(days=7)

    accounts_tracked = await account_repository.count_accounts(db)
    events_total = await report_repository.count_approved(db)
    events_today = await report_repository.count_reports_since(db, start_of_day)
    events_last_7 = await report_repository.count_reports_since(db, seven_days_ago)

    top_accounts = await account_repository.list_top_accounts(db, limit=20)
    if top_accounts:
        avg_weekly_delta = sum(a.score for a in top_accounts) / len(top_accounts)
    else:
        avg_weekly_delta = 0.0

    net_momentum = (
        (events_last_7 / events_total * 100) if events_total > 0 else 0.0
    )

    return {
        "accounts_tracked": accounts_tracked,
        "events_today": events_today,
        "events_total": events_total,
        "events_last_7": events_last_7,
        "avg_weekly_delta": round(avg_weekly_delta, 2),
        "net_momentum": round(net_momentum, 2),
    }
