from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import raise_api_error
from app.models.audit_request import AuditRequest
from app.models.enums import AuditRequestStatus
from app.repositories import audit_request_repository as repo


async def create_audit_request(
    db: AsyncSession,
    user_id: UUID,
    account_id: UUID,
    reason: str,
) -> AuditRequest:
    audit_request = await repo.create(db, user_id, account_id, reason)
    await db.commit()
    await db.refresh(audit_request)
    return audit_request


async def list_open(
    db: AsyncSession,
    limit: int,
    cursor: str | None,
) -> tuple[list[AuditRequest], str | None]:
    return await repo.list_open(db, limit, cursor)


async def update_status(
    db: AsyncSession,
    audit_request_id: UUID,
    reviewer_id: UUID,
    status: AuditRequestStatus,
) -> AuditRequest:
    audit_request = await repo.get_by_id(db, audit_request_id)
    if audit_request is None:
        raise_api_error("not_found", "Audit request not found")

    updated = await repo.update(db, audit_request, status=status)
    await db.commit()
    await db.refresh(updated)
    return updated
