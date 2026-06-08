from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import raise_api_error
from app.models.enums import AdminActionType, ModerationRequestStatus, NotificationType
from app.models.moderation_request import ModerationRequest
from app.repositories import (
    moderation_request_repository as repo,
    notification_repository,
    report_repository,
)
from app.services import admin_action_service

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
        raise_api_error("already_decided", "Moderation request has already been decided")

    report = await report_repository.get_by_id(db, moderation_request.report_id)
    if status == ModerationRequestStatus.APPROVED and report is not None:
        await report_repository.update(db, report, visibility="hidden")

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

    if updated.requested_by is not None:
        if status == ModerationRequestStatus.APPROVED:
            title = "Moderation request approved"
            message = review_note or "Your filing was hidden after moderator review."
        else:
            title = "Moderation request rejected"
            message = (
                review_note
                or "A moderator reviewed your request and kept the filing visible."
            )
        await notification_repository.create(
            db,
            user_id=updated.requested_by,
            notification_type=NotificationType.MODERATION,
            title=title,
            message=message,
            metadata_json={
                "moderation_request_id": str(updated.id),
                "report_id": str(updated.report_id),
                "account_id": str(updated.account_id),
            },
        )
        await db.commit()

    await admin_action_service.log_action(
        db,
        actor_user_id=reviewer_id,
        action_type=AdminActionType.MODERATION_DECIDE,
        target_type="moderation_request",
        target_id=updated.id,
        reason=review_note,
        metadata_json={
            "verdict": status.value,
            "report_id": str(updated.report_id),
        },
    )

    return updated
