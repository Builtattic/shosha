from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.claim_request import ClaimRequest
from app.models.enums import ClaimRequestStatus
from app.repositories._pagination import (
    apply_created_at_cursor,
    build_next_cursor,
    decode_cursor,
)

_ACTIVE_CLAIM_STATUSES = (ClaimRequestStatus.PENDING, ClaimRequestStatus.APPROVED)


async def get_by_id(db: AsyncSession, claim_id: UUID) -> ClaimRequest | None:
    result = await db.execute(
        select(ClaimRequest).where(ClaimRequest.id == claim_id)
    )
    return result.scalar_one_or_none()


async def get_by_account_and_user(
    db: AsyncSession,
    account_id: UUID,
    user_id: UUID,
) -> ClaimRequest | None:
    result = await db.execute(
        select(ClaimRequest).where(
            ClaimRequest.account_id == account_id,
            ClaimRequest.requester_user_id == user_id,
            ClaimRequest.status.in_(_ACTIVE_CLAIM_STATUSES),
        )
    )
    return result.scalar_one_or_none()


async def get_any_by_account_and_user(
    db: AsyncSession,
    account_id: UUID,
    user_id: UUID,
) -> ClaimRequest | None:
    result = await db.execute(
        select(ClaimRequest).where(
            ClaimRequest.account_id == account_id,
            ClaimRequest.requester_user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def list_for_user(
    db: AsyncSession,
    user_id: UUID,
    limit: int = 20,
    cursor: str | None = None,
) -> tuple[list[ClaimRequest], str | None]:
    stmt = select(ClaimRequest).where(ClaimRequest.requester_user_id == user_id)
    stmt = apply_created_at_cursor(
        stmt, ClaimRequest.created_at, decode_cursor(cursor), descending=True
    )
    stmt = stmt.order_by(
        ClaimRequest.created_at.desc(),
        ClaimRequest.id.desc(),
    ).limit(limit + 1)
    result = await db.execute(stmt)
    return build_next_cursor(list(result.scalars().all()), limit)


async def list_pending(
    db: AsyncSession,
    limit: int = 50,
    cursor: str | None = None,
) -> tuple[list[ClaimRequest], str | None]:
    stmt = select(ClaimRequest).where(ClaimRequest.status == ClaimRequestStatus.PENDING)
    stmt = apply_created_at_cursor(
        stmt, ClaimRequest.created_at, decode_cursor(cursor), descending=False
    )
    stmt = stmt.order_by(
        ClaimRequest.created_at.asc(),
        ClaimRequest.id.asc(),
    ).limit(limit + 1)
    result = await db.execute(stmt)
    return build_next_cursor(list(result.scalars().all()), limit)


async def create(
    db: AsyncSession,
    account_id: UUID,
    requester_user_id: UUID,
    evidence_type: str | None,
    evidence_payload: dict | None,
) -> ClaimRequest:
    claim = ClaimRequest(
        account_id=account_id,
        requester_user_id=requester_user_id,
        evidence_type=evidence_type,
        evidence_payload=evidence_payload,
    )
    db.add(claim)
    await db.flush()
    await db.refresh(claim)
    return claim


async def update_status(
    db: AsyncSession,
    claim: ClaimRequest,
    status: ClaimRequestStatus,
    reviewed_by: UUID,
    reviewed_at: datetime,
) -> ClaimRequest:
    claim.status = status
    claim.reviewed_by = reviewed_by
    claim.reviewed_at = reviewed_at
    await db.flush()
    await db.refresh(claim)
    return claim
