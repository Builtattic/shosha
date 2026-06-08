from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_request import AuditRequest
from app.models.enums import AuditRequestStatus
from app.repositories._pagination import (
    apply_created_at_cursor,
    build_next_cursor,
    decode_cursor,
)

_OPEN_AUDIT_STATUSES = (AuditRequestStatus.PENDING, AuditRequestStatus.IN_PROGRESS)


async def create(
    db: AsyncSession,
    user_id: UUID,
    account_id: UUID,
    reason: str,
) -> AuditRequest:
    audit_request = AuditRequest(
        user_id=user_id,
        account_id=account_id,
        reason=reason,
    )
    db.add(audit_request)
    await db.flush()
    await db.refresh(audit_request)
    return audit_request


async def get_by_id(db: AsyncSession, audit_request_id: UUID) -> AuditRequest | None:
    result = await db.execute(
        select(AuditRequest).where(AuditRequest.id == audit_request_id)
    )
    return result.scalar_one_or_none()


async def update(db: AsyncSession, obj: AuditRequest, **kwargs) -> AuditRequest:
    for key, value in kwargs.items():
        setattr(obj, key, value)
    await db.flush()
    await db.refresh(obj)
    return obj


async def list_open(
    db: AsyncSession,
    limit: int = 50,
    cursor: str | None = None,
) -> tuple[list[AuditRequest], str | None]:
    stmt = select(AuditRequest).where(AuditRequest.status.in_(_OPEN_AUDIT_STATUSES))
    stmt = apply_created_at_cursor(
        stmt, AuditRequest.created_at, decode_cursor(cursor), descending=True
    )
    stmt = stmt.order_by(
        AuditRequest.created_at.desc(),
        AuditRequest.id.desc(),
    ).limit(limit + 1)
    result = await db.execute(stmt)
    return build_next_cursor(list(result.scalars().all()), limit)
