from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.repositories import account_repository, ledger_repository
from app.services import scoring_service

# Buckets follow scoring engine (W1≤7d, W2=8–30d, W3>30d) not fixed 7-day calendar windows


async def run_weekly_momentum(db: AsyncSession) -> dict:
    now = datetime.now(timezone.utc)
    account_ids = await account_repository.list_all_account_ids(db)
    accounts_updated = 0

    for account_id in account_ids:
        entries = await ledger_repository.list_for_account(db, account_id)
        result = scoring_service.sum_deltas_by_age(entries, now)
        await db.execute(
            update(Account)
            .where(Account.id == account_id)
            .values(
                w1_delta=result["w1_delta"],
                w2_delta=result["w2_delta"],
                w3_delta=result["w3_delta"],
                momentum_updated_at=now,
            )
        )
        accounts_updated += 1

    # DO NOT commit inside loop — one commit after all updates
    await db.commit()

    return {
        "accounts_updated": accounts_updated,
        "run_at": now.isoformat(),
    }


async def get_weekly_momentum_status(db: AsyncSession) -> dict:
    last_run_at, accounts_with_momentum = (
        await account_repository.get_momentum_status(db)
    )
    return {
        "last_run_at": last_run_at.isoformat() if last_run_at else None,
        "accounts_with_momentum": accounts_with_momentum,
        "engine": "v2",
    }
