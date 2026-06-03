"""
Report business logic.

Phase 2 (V1 parity): AI adjudication (gemini AiVerdict JSONB), scoring/ledger,
rate limits, reporter privacy redaction, persist reports.type on model.
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import raise_api_error
from app.models.enums import ReportStatus
from app.models.report import Report, ReportComment, ReportVote
from app.models.user import User
from app.repositories import (
    add_comment as repo_add_comment,
    add_media,
    create_report as repo_create_report,
    get_account_by_id,
    get_report_by_id,
    list_comments as repo_list_comments,
    list_moderation_queue as repo_list_moderation_queue,
    list_reports as repo_list_reports,
    update_status,
    upsert_vote,
)
from app.schemas.report import (
    CommentCreateRequest,
    ModerationDecisionRequest,
    ModerationRequestRequest,
    ReportCreateRequest,
    VoteRequest,
)
from app.services._helpers import is_moderator_plus

_ALLOWED_TRANSITIONS: dict[ReportStatus, set[ReportStatus]] = {
    ReportStatus.PENDING: {
        ReportStatus.APPROVED,
        ReportStatus.REJECTED,
        ReportStatus.REMOVED,
    },
    ReportStatus.APPROVED: {ReportStatus.REMOVED},
    ReportStatus.REJECTED: {ReportStatus.APPROVED},
    ReportStatus.REMOVED: set(),
}

_VALID_REPORT_TYPES = frozenset({"positive", "negative"})


def _validate_report_create(data: ReportCreateRequest) -> None:
    if data.type not in _VALID_REPORT_TYPES:
        raise_api_error("validation_error", "Report type must be positive or negative")
    if not data.is_irl and not data.evidence_source_url:
        raise_api_error(
            "validation_error",
            "Proof source URL is required for online reports.",
        )


async def create_report(
    db: AsyncSession,
    data: ReportCreateRequest,
    current_user: User,
) -> Report:
    account = await get_account_by_id(db, data.account_id)
    if account is None:
        raise_api_error("not_found", "Account not found")

    _validate_report_create(data)

    report = await repo_create_report(
        db,
        data.account_id,
        current_user.id,
        data.title,
        data.description,
    )
    for item in data.media:
        await add_media(
            db,
            report.id,
            item.media_type,
            item.url,
            item.thumbnail_url,
        )

    await db.commit()
    loaded = await get_report_by_id(db, report.id)
    assert loaded is not None
    return loaded


async def list_reports(
    db: AsyncSession,
    account_id: UUID | None,
    status: ReportStatus | None,
    limit: int,
    cursor: str | None,
    current_user: User | None,
) -> tuple[list[Report], str | None]:
    effective_status = status
    if not is_moderator_plus(current_user):
        effective_status = ReportStatus.APPROVED
    return await repo_list_reports(db, account_id, effective_status, limit, cursor)


async def get_report(
    db: AsyncSession,
    report_id: UUID,
    current_user: User | None,
) -> Report:
    # Phase 2: extend anon/mod rules to hide PENDING/REJECTED like V1 "under seal".
    report = await get_report_by_id(db, report_id)
    if report is None:
        raise_api_error("not_found", "Report not found")
    if not is_moderator_plus(current_user) and report.status == ReportStatus.REMOVED:
        raise_api_error("forbidden", "Report is not available")
    return report


async def vote_on_report(
    db: AsyncSession,
    report_id: UUID,
    data: VoteRequest,
    current_user: User,
) -> tuple[ReportVote, int, int]:
    report = await get_report_by_id(db, report_id)
    if report is None:
        raise_api_error("not_found", "Report not found")

    vote, align_count, oppose_count = await upsert_vote(
        db,
        report_id,
        current_user.id,
        data.vote_type,
    )
    await db.commit()
    await db.refresh(vote)
    return vote, align_count, oppose_count


async def add_comment(
    db: AsyncSession,
    report_id: UUID,
    data: CommentCreateRequest,
    current_user: User,
) -> ReportComment:
    report = await get_report_by_id(db, report_id)
    if report is None:
        raise_api_error("not_found", "Report not found")

    comment = await repo_add_comment(db, report_id, current_user.id, data.body)
    await db.commit()
    await db.refresh(comment)
    return comment


async def list_comments(
    db: AsyncSession,
    report_id: UUID,
    limit: int,
    cursor: str | None,
) -> tuple[list[ReportComment], str | None]:
    report = await get_report_by_id(db, report_id)
    if report is None:
        raise_api_error("not_found", "Report not found")
    return await repo_list_comments(db, report_id, limit, cursor)


async def request_moderation(
    db: AsyncSession,
    report_id: UUID,
    data: ModerationRequestRequest,
    current_user: User,
) -> dict:
    # TODO Phase 2: moderation_requests table, dedupe pending, admin notifications.
    _ = data
    report = await get_report_by_id(db, report_id)
    if report is None:
        raise_api_error("not_found", "Report not found")

    is_reporter = report.reporter_user_id == current_user.id
    if not is_reporter and not is_moderator_plus(current_user):
        raise_api_error("forbidden", "Not authorized to request moderation for this report")

    return {"queued": True, "report_status": report.status.value}


async def moderate_report(
    db: AsyncSession,
    report_id: UUID,
    data: ModerationDecisionRequest,
    current_user: User,
) -> Report:
    report = await get_report_by_id(db, report_id)
    if report is None:
        raise_api_error("not_found", "Report not found")

    allowed = _ALLOWED_TRANSITIONS.get(report.status, set())
    if data.decision not in allowed:
        raise_api_error(
            "conflict",
            f"Cannot transition report from {report.status.value} to {data.decision.value}",
        )

    report = await update_status(
        db,
        report,
        data.decision,
        current_user.id,
        datetime.now(timezone.utc),
    )
    await db.commit()
    loaded = await get_report_by_id(db, report.id)
    assert loaded is not None
    return loaded


async def get_moderation_queue(
    db: AsyncSession,
    status: ReportStatus | None,
    platform: str | None,
    sort: str,
    limit: int,
    cursor: str | None,
) -> tuple[list[Report], str | None]:
    return await repo_list_moderation_queue(db, status, platform, sort, limit, cursor)
