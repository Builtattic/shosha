from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import raise_api_error
from app.models.enums import AdminActionType
from app.repositories import account_repository, ledger_repository
from app.services import admin_action_service, scoring_service


async def replay_account(db: AsyncSession, account_id: UUID, actor_id: UUID) -> dict:
    account = await account_repository.get_by_id(db, account_id)
    if account is None:
        raise_api_error("not_found", "Account not found")

    score, breakdown = await scoring_service.rebuild_account_score(db, account_id)
    entries = await ledger_repository.list_for_account(db, account_id)
    entries_applied = len(entries)

    await account_repository.update(
        db, account, score=score, score_breakdown=breakdown
    )
    await db.commit()

    await admin_action_service.log_action(
        db,
        actor_user_id=actor_id,
        action_type=AdminActionType.SCORE_REPLAY,
        target_type="account",
        target_id=account_id,
        metadata_json={"final_score": score, "actor_id": str(actor_id)},
    )
    return {
        "account_id": str(account_id),
        "final_score": score,
        "entries_applied": entries_applied,
    }


async def replay_all(db: AsyncSession, actor_id: UUID) -> dict:
    accounts = await account_repository.list_all_admin(db, limit=1000)
    results: list[dict] = []
    for account in accounts:
        try:
            result = await replay_account(db, account.id, actor_id)
            results.append(result)
        except Exception:
            await db.rollback()
            results.append(
                {"account_id": str(account.id), "error": "replay_failed"}
            )

    # GATE CHECK: AdminAction.target_id is nullable=False. The global replay log
    # has no single account, so actor_id is used as the required fallback.
    await admin_action_service.log_action(
        db,
        actor_user_id=actor_id,
        action_type=AdminActionType.SCORE_REPLAY,
        target_type="account",
        target_id=actor_id,
        metadata_json={
            "scope": "all",
            "count": len(results),
            "actor_id": str(actor_id),
        },
    )
    return {"account_results": results}
