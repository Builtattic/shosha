from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import raise_api_error
from app.models.enums import ModerationRequestStatus
from app.models.moderation_request import ModerationRequest
from app.repositories import moderation_request_repository as repo

_DECISION_STATUSES = (ModerationRequestStatus.APPROVED, ModerationRequestStatus.REJECTED)


async def create_moderation_request(
    db: AsyncSession,
    report_id: UUID,
    account_id: UUID,
    requested_by: UUID,
    reason: str,
    evidence_links: list | None = None,
) -> ModerationRequest:
    existing = await repo.get_pending_by_report(db, report_id)
    if existing is not None:
        raise_api_error(
            "conflict", "A pending moderation request already exists for this report"
        )
    moderation_request = await repo.create(
        db, report_id, account_id, requested_by, reason, evidence_links
    )
    await db.commit()
    await db.refresh(moderation_request)
    return moderation_request


async def list_moderation_requests(
    db: AsyncSession,
    limit: int,
    cursor: str | None,
) -> tuple[list[ModerationRequest], str | None]:
    return await repo.list_all(db, limit, cursor)


async def list_by_report(db: AsyncSession, report_id: UUID) -> list[ModerationRequest]:
    return await repo.list_by_report(db, report_id)


async def decide_moderation_request(
    db: AsyncSession,
    moderation_request_id: UUID,
    reviewer_id: UUID,
    status: ModerationRequestStatus,
    review_note: str | None = None,
) -> ModerationRequest:
    if status not in _DECISION_STATUSES:
        raise_api_error("validation_error", "Decision must be APPROVED or REJECTED")

    moderation_request = await repo.get_by_id(db, moderation_request_id)
    if moderation_request is None:
        raise_api_error("not_found", "Moderation request not found")

    if moderation_request.status != ModerationRequestStatus.PENDING:
        raise_api_error("conflict", "Moderation request has already been decided")

    updated = await repo.update(
        db,
        moderation_request,
        status=status,
        reviewed_by=reviewer_id,
        review_note=review_note,
        reviewed_at=datetime.now(timezone.utc),
    )
    await db.commit()
    await db.refresh(updated)
    return updated
