from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_moderator
from app.core.responses import success
from app.models.claim_request import ClaimRequest
from app.models.dispute import Dispute
from app.models.enums import ClaimRequestStatus, DisputeStatus
from app.models.user import User
from app.repositories import account_repository, report_repository, user_repository
from app.schemas.common import SuccessEnvelope

router = APIRouter()


async def _count_pending_claims(db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(ClaimRequest)
        .where(ClaimRequest.status == ClaimRequestStatus.PENDING)
    )
    return result.scalar_one()


async def _count_pending_disputes(db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(Dispute)
        .where(
            Dispute.status.in_([DisputeStatus.PENDING, DisputeStatus.UNDER_REVIEW])
        )
    )
    return result.scalar_one()


@router.get(
    "/stats",
    response_model=SuccessEnvelope[dict],
    summary="Get admin stats",
)
async def get_admin_stats(
    current_user: User = Depends(require_moderator),
    db: AsyncSession = Depends(get_db),
):
    (
        total_users,
        active_users,
        total_accounts,
        accounts_by_status,
        reports_by_status,
        pending_claims,
        pending_disputes,
    ) = await asyncio.gather(
        user_repository.count_users(db),
        user_repository.count_active_users(db),
        account_repository.count_accounts(db),
        account_repository.count_by_status(db),
        report_repository.count_by_status(db),
        _count_pending_claims(db),
        _count_pending_disputes(db),
    )
    return success(
        {
            "users": {"total": total_users, "active": active_users},
            "accounts": {"total": total_accounts, "by_status": accounts_by_status},
            "reports": {
                "total": sum(reports_by_status.values()),
                "by_status": reports_by_status,
                "pending_count": reports_by_status["PENDING"],
            },
            "claims": {"pending": pending_claims},
            "disputes": {"pending": pending_disputes},
        }
    )
