from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import raise_api_error
from app.models.deletion_request import DeletionRequest
from app.models.enums import DeletionRequestStatus
from app.repositories import deletion_request_repository as repo

_DECISION_STATUSES = (
    DeletionRequestStatus.APPROVED,
    DeletionRequestStatus.REJECTED,
    DeletionRequestStatus.COMPLETED,
)


async def create_deletion_request(
    db: AsyncSession,
    user_id: UUID,
    user_snapshot: dict | None,
    reason: str,
    details: str | None = None,
    attachment_urls: list | None = None,
) -> DeletionRequest:
    recent = await repo.list_by_user(db, user_id, limit=5)
    if any(r.status == DeletionRequestStatus.PENDING for r in recent):
        raise_api_error("conflict", "You already have a pending deletion request")

    deletion_request = await repo.create(
        db,
        user_id=user_id,
        user_snapshot=user_snapshot,
        reason=reason,
        details=details,
        attachment_urls=attachment_urls if attachment_urls is not None else [],
    )
    await db.commit()
    await db.refresh(deletion_request)
    return deletion_request


async def list_pending(
    db: AsyncSession,
    limit: int,
    cursor: str | None,
) -> tuple[list[DeletionRequest], str | None]:
    return await repo.list_pending(db, limit, cursor)


async def list_all(
    db: AsyncSession,
    limit: int,
    cursor: str | None,
) -> tuple[list[DeletionRequest], str | None]:
    return await repo.list_all(db, limit, cursor)


async def decide_deletion_request(
    db: AsyncSession,
    deletion_request_id: UUID,
    reviewer_id: UUID,
    status: DeletionRequestStatus,
    review_note: str | None = None,
) -> DeletionRequest:
    if status not in _DECISION_STATUSES:
        raise_api_error(
            "validation_error", "Decision must be APPROVED, REJECTED, or COMPLETED"
        )

    deletion_request = await repo.get_by_id(db, deletion_request_id)
    if deletion_request is None:
        raise_api_error("not_found", "Deletion request not found")

    updated = await repo.update(
        db,
        deletion_request,
        status=status,
        reviewed_by=reviewer_id,
        review_note=review_note,
        reviewed_at=datetime.now(timezone.utc),
    )
    await db.commit()
    await db.refresh(updated)
    return updated
