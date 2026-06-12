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
from app.integrations.gemini import (
    adjudicate_report,
    heuristic_adjudication,
    verdict_to_dict,
)
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
    list_feed as repo_list_feed,
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
from app.services import moderation_request_service
from app.services._helpers import is_moderator_plus
from app.services.notification_service import emit_report_notification
from app.services.scoring_service import (
    apply_report_score,
    profile_multipliers_from_account,
    resolve_sheet_base_impact,
    resolve_sheet_base_impact_from_admin_impact,
    reverse_report_score,
)

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


def _apply_ai_scoring_fields(report: Report) -> None:
    """Derive deed and base_score from the AI verdict for later scoring.

    deed -> first category tag; base_score -> proposedImpact scaled to the
    workbook range (proposedImpact is bounded -10..10, base scores are -100..100
    at that magnitude).
    """
    verdict = report.ai_verdict or {}
    tags = verdict.get("categoryTags")
    if isinstance(tags, list) and tags:
        report.deed = str(tags[0])[:256]
    proposed_impact = verdict.get("proposedImpact")
    if proposed_impact is not None:
        report.base_score = float(proposed_impact) * 10.0


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
        report_type=data.type,
        is_irl=data.is_irl,
        evidence_source_url=data.evidence_source_url,
    )
    for item in data.media:
        await add_media(
            db,
            report.id,
            item.media_type,
            item.url,
            item.thumbnail_url,
        )

    first_media = data.media[0] if data.media else None
    try:
        verdict = await adjudicate_report(
            description=data.description,
            report_type=data.type,
            account_display_name=account.display_name or account.handle,
            platform=account.platform,
            media_url=first_media.url if first_media else None,
            media_type=first_media.media_type if first_media else None,
        )
        report.ai_verdict = verdict_to_dict(verdict)
    except Exception:
        fallback = heuristic_adjudication(data.description, data.type)
        fallback.used_heuristic = True
        report.ai_verdict = verdict_to_dict(fallback)

    _apply_ai_scoring_fields(report)

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
    report = await get_report_by_id(db, report_id)
    if report is None:
        raise_api_error("not_found", "Report not found")

    is_reporter = report.reporter_user_id == current_user.id
    if not is_reporter and not is_moderator_plus(current_user):
        raise_api_error("forbidden", "Not authorized to request moderation for this report")

    evidence_links = [data.evidence_url] if data.evidence_url else []
    await moderation_request_service.create_moderation_request(
        db,
        report_id=report.id,
        account_id=report.account_id,
        requested_by=current_user.id,
        reason=data.reason or "",
        evidence_links=evidence_links,
    )

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

    old_status = report.status
    report = await update_status(
        db,
        report,
        data.decision,
        current_user.id,
        datetime.now(timezone.utc),
    )
    new_status = report.status
    account = await get_account_by_id(db, report.account_id)
    if new_status == ReportStatus.APPROVED and old_status != ReportStatus.APPROVED:
        if account is not None:
            # Resolve deed/base_score before scoring, mirroring V1 adjudicate:
            # admin-supplied deed/base_score override; otherwise resolve from the
            # final impact (admin delta) or the scoring sheet.
            if data.deed is not None:
                report.deed = data.deed
            if data.base_score is not None:
                report.base_score = data.base_score
            if report.deed is None and report.base_score is None:
                if data.final_impact is not None:
                    row = resolve_sheet_base_impact_from_admin_impact(
                        data.final_impact, report.report_type
                    )
                else:
                    row = resolve_sheet_base_impact(report.deed, report.report_type)
                report.deed = row["deed"]
                report.base_score = float(row["base_score"])

            # Persist the resolved report fields so apply_report_score's read of
            # report.base_score sees the updated value (flush, not commit).
            await db.flush()

            multipliers = profile_multipliers_from_account(
                account,
                repetition_pattern=data.repetition_pattern,
                intent=data.intent,
                circumstances=data.circumstances,
            )
            # scoring_service owns its own commit; notification commit follows below.
            await apply_report_score(
                db,
                report,
                account,
                multipliers,
                category_override=data.category or None,
            )
    elif new_status == ReportStatus.REJECTED and old_status == ReportStatus.APPROVED:
        if account is not None:
            await reverse_report_score(db, report, account)

    if account is not None and new_status in {
        ReportStatus.APPROVED,
        ReportStatus.REJECTED,
    }:
        await emit_report_notification(
            db=db,
            report=report,
            account=account,
            new_status=new_status,
            reviewer=current_user,
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


async def get_feed(
    db: AsyncSession,
    limit: int = 20,
    cursor: str | None = None,
    platform: str | None = None,
    current_user=None,
) -> tuple[list[Report], str | None]:
    return await repo_list_feed(db, limit, cursor, platform)
