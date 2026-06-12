from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories import account_repository
from app.repositories import report_bookmark_repository as bookmark_repo
from app.repositories import report_repository
from app.services import scoring_service


async def get_bookmarks(db: AsyncSession, current_user_id: UUID) -> list[dict]:
    bookmarks, _ = await bookmark_repo.list_by_user(
        db, current_user_id, limit=50, cursor=None
    )
    results: list[dict] = []
    for bookmark in bookmarks:
        report = await report_repository.get_by_id(db, bookmark.report_id)
        if report is None:
            continue
        account = await account_repository.get_by_id(db, report.account_id)
        results.append(
            {
                "bookmark_id": str(bookmark.id),
                "report": {
                    "id": str(report.id),
                    "title": report.title,
                    "description": report.description,
                    "status": report.status.value,
                    "deed": report.deed,
                    "base_score": report.base_score,
                    "created_at": report.created_at.isoformat(),
                },
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
                "bookmarked": True,
            }
        )
    return results


async def get_filings(db: AsyncSession, current_user_id: UUID) -> dict:
    reports = await report_repository.list_by_reporter(db, current_user_id, limit=50)
    filings = []
    for r in reports:
        delta = r.base_score or 0
        filing_type = "positive" if delta > 0 else "negative"
        filings.append(
            {
                "id": str(r.id),
                "title": r.title or r.deed,
                "category": r.deed,
                "delta": delta,
                "type": filing_type,
                "status": r.status.value,
                "created_at": r.created_at.isoformat(),
            }
        )
    return {"filings": filings}


async def get_score_replay(db: AsyncSession, current_user_id: UUID) -> dict:
    accounts = await account_repository.list_by_owner(db, current_user_id, limit=50)
    account_results = []
    for account in accounts:
        score, breakdown = await scoring_service.rebuild_account_score(db, account.id)
        await account_repository.update(
            db, account, score=score, score_breakdown=breakdown
        )
        higher_count = await account_repository.count_accounts_with_higher_score(
            db, score
        )
        account_results.append(
            {
                "account_id": str(account.id),
                "final_score": score,
                "platform": account.platform,
                "handle": account.handle,
                "global_rank": higher_count + 1,
            }
        )
    await db.commit()
    return {"account_results": account_results, "user_results": []}
