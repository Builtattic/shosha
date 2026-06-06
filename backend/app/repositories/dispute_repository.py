from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dispute import Dispute
from app.models.enums import DisputeStatus
from app.repositories._pagination import (
    apply_created_at_cursor,
    build_next_cursor,
    decode_cursor,
)

_OPEN_DISPUTE_STATUSES = (DisputeStatus.PENDING, DisputeStatus.UNDER_REVIEW)
_PENDING_QUEUE_STATUSES = (DisputeStatus.PENDING, DisputeStatus.UNDER_REVIEW)


async def get_by_id(db: AsyncSession, dispute_id: UUID) -> Dispute | None:
    result = await db.execute(
        select(Dispute).where(Dispute.id == dispute_id)
    )
    return result.scalar_one_or_none()


async def get_by_report_and_user(
    db: AsyncSession,
    report_id: UUID,
    user_id: UUID,
) -> Dispute | None:
    result = await db.execute(
        select(Dispute).where(
            Dispute.report_id == report_id,
            Dispute.requester_user_id == user_id,
            Dispute.status.in_(_OPEN_DISPUTE_STATUSES),
        )
    )
    return result.scalar_one_or_none()


async def list_for_user(
    db: AsyncSession,
    user_id: UUID,
    limit: int = 20,
    cursor: str | None = None,
) -> tuple[list[Dispute], str | None]:
    stmt = select(Dispute).where(Dispute.requester_user_id == user_id)
    stmt = apply_created_at_cursor(
        stmt, Dispute.created_at, decode_cursor(cursor), descending=True
    )
    stmt = stmt.order_by(
        Dispute.created_at.desc(),
        Dispute.id.desc(),
    ).limit(limit + 1)
    result = await db.execute(stmt)
    return build_next_cursor(list(result.scalars().all()), limit)


async def list_pending(
    db: AsyncSession,
    limit: int = 50,
    cursor: str | None = None,
) -> tuple[list[Dispute], str | None]:
    stmt = select(Dispute).where(Dispute.status.in_(_PENDING_QUEUE_STATUSES))
    stmt = apply_created_at_cursor(
        stmt, Dispute.created_at, decode_cursor(cursor), descending=False
    )
    stmt = stmt.order_by(
        Dispute.created_at.asc(),
        Dispute.id.asc(),
    ).limit(limit + 1)
    result = await db.execute(stmt)
    return build_next_cursor(list(result.scalars().all()), limit)


async def create(
    db: AsyncSession,
    report_id: UUID,
    account_id: UUID,
    requester_user_id: UUID,
    reason: str,
    evidence_url: str | None,
) -> Dispute:
    dispute = Dispute(
        report_id=report_id,
        account_id=account_id,
        requester_user_id=requester_user_id,
        reason=reason,
        evidence_url=evidence_url,
    )
    db.add(dispute)
    await db.flush()
    await db.refresh(dispute)
    return dispute


async def update_status(
    db: AsyncSession,
    dispute: Dispute,
    status: DisputeStatus,
    reviewed_by: UUID,
    reviewed_at: datetime,
) -> Dispute:
    dispute.status = status
    dispute.reviewed_by = reviewed_by
    dispute.reviewed_at = reviewed_at
    await db.flush()
    await db.refresh(dispute)
    return dispute


async def withdraw(db: AsyncSession, dispute: Dispute) -> Dispute:
    dispute.status = DisputeStatus.WITHDRAWN
    await db.flush()
    await db.refresh(dispute)
    return dispute
