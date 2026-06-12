from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import raise_api_error
from app.models.dispute import Dispute
from app.models.enums import DisputeStatus, NotificationType, ReportStatus
from app.models.user import User
from app.repositories import (
    create_dispute,
    create_notification,
    get_dispute_by_id,
    get_dispute_by_report_and_user,
    get_report_by_id,
    list_disputes_for_user,
    list_pending_disputes,
    update_dispute_status,
    withdraw_dispute as repo_withdraw_dispute,
)
from app.schemas.dispute import DisputeCreateRequest, DisputeDecisionRequest
from app.services._helpers import is_moderator_plus

_DECIDABLE_STATUSES = frozenset({DisputeStatus.PENDING, DisputeStatus.UNDER_REVIEW})


async def file_dispute(
    db: AsyncSession,
    data: DisputeCreateRequest,
    current_user: User,
) -> Dispute:
    report = await get_report_by_id(db, data.report_id)
    if report is None:
        raise_api_error("not_found", "Report not found")

    if report.status != ReportStatus.APPROVED:
        raise_api_error("conflict", "Only approved reports can be disputed")

    if data.account_id != report.account_id:
        raise_api_error("validation_error", "account_id does not match the report")

    existing = await get_dispute_by_report_and_user(
        db, data.report_id, current_user.id
    )
    if existing is not None:
        raise_api_error("conflict", "You already have an open dispute on this report")

    reporter_user_id = report.reporter_user_id

    dispute = await create_dispute(
        db,
        data.report_id,
        data.account_id,
        current_user.id,
        data.reason,
        data.evidence_url,
    )
    await db.commit()
    await db.refresh(dispute)

    if reporter_user_id is not None and reporter_user_id != current_user.id:
        await create_notification(
            db,
            reporter_user_id,
            NotificationType.DISPUTE,
            "Your filing is being disputed",
            "A dispute has been filed against your filing. A moderator will review.",
            metadata_json={
                "report_id": str(data.report_id),
                "dispute_id": str(dispute.id),
                "account_id": str(data.account_id),
            },
        )
        await db.commit()

    return dispute


async def get_my_disputes(
    db: AsyncSession,
    current_user: User,
    limit: int,
    cursor: str | None,
) -> tuple[list[Dispute], str | None]:
    return await list_disputes_for_user(db, current_user.id, limit, cursor)


async def get_dispute(
    db: AsyncSession,
    dispute_id: UUID,
    current_user: User,
) -> Dispute:
    dispute = await get_dispute_by_id(db, dispute_id)
    if dispute is None:
        raise_api_error("not_found", "Dispute not found")

    is_requester = dispute.requester_user_id == current_user.id
    if not is_requester and not is_moderator_plus(current_user):
        raise_api_error("forbidden", "Not authorized to view this dispute")

    return dispute


async def get_pending_disputes(
    db: AsyncSession,
    current_user: User,
    limit: int,
    cursor: str | None,
) -> tuple[list[Dispute], str | None]:
    if not is_moderator_plus(current_user):
        raise_api_error("forbidden", "Moderator access required")
    return await list_pending_disputes(db, limit, cursor)


async def decide_dispute(
    db: AsyncSession,
    dispute_id: UUID,
    data: DisputeDecisionRequest,
    current_user: User,
) -> Dispute:
    if not is_moderator_plus(current_user):
        raise_api_error("forbidden", "Moderator access required")

    dispute = await get_dispute_by_id(db, dispute_id)
    if dispute is None:
        raise_api_error("not_found", "Dispute not found")

    if dispute.status not in _DECIDABLE_STATUSES:
        raise_api_error("conflict", "Dispute has already been decided")

    now = datetime.now(timezone.utc)
    await update_dispute_status(
        db,
        dispute,
        data.decision,
        current_user.id,
        now,
    )
    await db.commit()

    loaded = await get_dispute_by_id(db, dispute.id)
    assert loaded is not None

    await create_notification(
        db,
        loaded.requester_user_id,
        NotificationType.DISPUTE,
        "Dispute resolved",
        "A moderator has reviewed your dispute.",
        metadata_json={
            "dispute_id": str(dispute_id),
            "report_id": str(loaded.report_id),
            "account_id": str(loaded.account_id),
        },
    )
    await db.commit()

    return loaded


async def withdraw_dispute(
    db: AsyncSession,
    dispute_id: UUID,
    current_user: User,
) -> Dispute:
    dispute = await get_dispute_by_id(db, dispute_id)
    if dispute is None:
        raise_api_error("not_found", "Dispute not found")

    if dispute.requester_user_id != current_user.id:
        raise_api_error("forbidden", "Not authorized to withdraw this dispute")

    if dispute.status != DisputeStatus.PENDING:
        raise_api_error("conflict", "Only pending disputes can be withdrawn")

    await repo_withdraw_dispute(db, dispute)
    await db.commit()

    loaded = await get_dispute_by_id(db, dispute.id)
    assert loaded is not None
    return loaded
