from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Body, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import (
    require_admin,
    require_moderator,
    require_super_admin,
)
from app.core.exceptions import raise_api_error
from app.core.responses import success
from app.models.claim_request import ClaimRequest
from app.models.dispute import Dispute
from app.models.enums import (
    AccountStatus,
    AdminActionType,
    ClaimRequestStatus,
    DisputeStatus,
    EvidenceProposalStatus,
    ModerationRequestStatus,
    ReportStatus,
    UserRole,
)
from app.models.user import User
from app.repositories import account_repository, report_repository, user_repository
from app.schemas.common import SuccessEnvelope
from app.services import (
    admin_account_service,
    admin_action_service,
    admin_ownership_service,
    admin_score_service,
    admin_user_service,
    evidence_proposal_service,
    moderation_request_service,
    site_setting_service,
)
from app.services.scoring_service import DEFAULT_MULTIPLIERS, apply_report_score

router = APIRouter()


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value is not None else None


def _serialize_user(user: User | None) -> dict | None:
    if user is None:
        return None
    return {
        "id": str(user.id),
        "username": user.username,
        "display_name": user.display_name,
        "photo_url": user.photo_url,
    }


def _serialize_account(account) -> dict | None:
    if account is None:
        return None
    return {
        "id": str(account.id),
        "display_name": account.display_name,
        "handle": account.handle,
        "platform": account.platform,
        "status": account.status.value,
        "score": account.score,
    }


def _serialize_report(report) -> dict | None:
    if report is None:
        return None
    return {
        "id": str(report.id),
        "account_id": str(report.account_id),
        "title": report.title,
        "description": report.description,
        "status": report.status.value,
        "deed": report.deed,
        "base_score": report.base_score,
        "visibility": report.visibility,
        "pinned": report.pinned,
        "featured": report.featured,
        "report_type": report.report_type,
        "created_at": _iso(report.created_at),
        "reported_at": _iso(report.reported_at),
    }


def _serialize_evidence_proposal(proposal) -> dict:
    return {
        "id": str(proposal.id),
        "account_id": str(proposal.account_id),
        "title": proposal.title,
        "summary": proposal.summary,
        "scoring_deed": proposal.scoring_deed,
        "scoring_category": proposal.scoring_category,
        "report_type": proposal.report_type,
        "base_score": proposal.base_score,
        "suggested_impact": proposal.suggested_impact,
        "confidence": proposal.confidence,
        "source_urls": proposal.source_urls or [],
        "source_titles": proposal.source_titles,
        "event_date": _iso(proposal.event_date),
        "status": proposal.status.value,
        "reviewed_at": _iso(proposal.reviewed_at),
        "reviewed_by": str(proposal.reviewed_by) if proposal.reviewed_by else None,
        "report_id": str(proposal.report_id) if proposal.report_id else None,
        "event_id": str(proposal.event_id) if proposal.event_id else None,
        "reporter_user_id": (
            str(proposal.reporter_user_id) if proposal.reporter_user_id else None
        ),
        "created_by_admin_id": (
            str(proposal.created_by_admin_id) if proposal.created_by_admin_id else None
        ),
        "anonymous_tag": proposal.anonymous_tag,
        "public_anonymous": proposal.public_anonymous,
        "created_at": _iso(proposal.created_at),
    }


def _serialize_moderation_request(req) -> dict:
    return {
        "id": str(req.id),
        "report_id": str(req.report_id),
        "account_id": str(req.account_id),
        "requested_by": str(req.requested_by),
        "reason": req.reason,
        "evidence_links": req.evidence_links or [],
        "status": req.status.value,
        "reviewed_by": str(req.reviewed_by) if req.reviewed_by else None,
        "review_note": req.review_note,
        "reviewed_at": _iso(req.reviewed_at),
        "created_at": _iso(req.created_at),
    }


def _serialize_admin_action(action) -> dict:
    return {
        "id": str(action.id),
        "actor_user_id": str(action.actor_user_id),
        "action_type": action.action_type.value,
        "target_type": action.target_type,
        "target_id": str(action.target_id) if action.target_id else None,
        "reason": action.reason,
        "metadata_json": action.metadata_json,
        "created_at": _iso(action.created_at),
    }


class ModerationDecideRequest(BaseModel):
    verdict: Literal["APPROVED", "REJECTED"]
    note: str = ""


class EvidenceDecideRequest(BaseModel):
    verdict: Literal["APPROVED", "REJECTED"]
    note: str = "Shosha evidence review."
    final_impact: float | None = None


class AdminCreateReportRequest(BaseModel):
    account_id: UUID
    type: Literal["positive", "negative"]
    description: str = Field(..., min_length=10, max_length=500)
    feelings: str = Field(default="Published by the Shosha admin team.", max_length=500)
    category: str = Field(..., min_length=1, max_length=120)
    deed: str = Field(..., min_length=1, max_length=160)
    base_score: float
    note: str = Field(default="Admin-created feed claim.", max_length=500)
    visibility: Literal["public", "hidden"] = "public"
    pinned: bool = False
    featured: bool = False


class AdminUpdateReportRequest(BaseModel):
    description: str | None = Field(default=None, max_length=500)
    visibility: Literal["public", "hidden"] | None = None
    pinned: bool | None = None
    featured: bool | None = None
    reported_at: datetime | None = None


def serialize_user(u) -> dict:
    return {
        "id": str(u.id),
        "username": u.username,
        "display_name": u.display_name,
        "email": u.email,
        "photo_url": u.photo_url,
        "role": u.role.value,
        "is_active": u.is_active,
        "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
        "created_at": u.created_at.isoformat(),
    }


def serialize_account(a) -> dict:
    return {
        "id": str(a.id),
        "platform": a.platform,
        "handle": a.handle,
        "display_name": a.display_name,
        "bio": a.bio,
        "status": a.status.value,
        "score": a.score,
        "owner_user_id": str(a.owner_user_id) if a.owner_user_id else None,
        "created_at": a.created_at.isoformat(),
    }


class AdminUserUpdateRequest(BaseModel):
    role: str | None = None
    is_active: bool | None = None
    email: str | None = None
    username: str | None = None
    display_name: str | None = None
    photo_url: str | None = None


class AdminAccountCreateRequest(BaseModel):
    platform: str
    handle: str
    display_name: str | None = None
    bio: str | None = None


class AdminAccountUpdateRequest(BaseModel):
    display_name: str | None = None
    bio: str | None = None
    status: str | None = None
    score: float | None = None
    owner_user_id: UUID | None = None


class AdminSettingsPatchRequest(BaseModel):
    allow_ai_reviewed_in_feed: bool | None = None
    allow_flagged_in_feed: bool | None = None
    feed_ranking_mode: str | None = None
    enabled_platforms: list[str] | None = None
    score_impact_min: float | None = None
    score_impact_max: float | None = None
    upload_max_bytes: int | None = None
    live_feed_enabled: bool | None = None
    dispute_threshold: int | None = None
    duplicate_threshold: float | None = None
    single_report_delta_cap: float | None = None
    daily_profile_delta_cap: float | None = None
    report_cooldown_hours: int | None = None


class AdminOwnershipAssignRequest(BaseModel):
    account_id: UUID
    user_id: UUID


class AdminOwnershipRevokeRequest(BaseModel):
    account_id: UUID


class AdminScoreReplayRequest(BaseModel):
    account_id: UUID | None = None


_SETTINGS_SNAKE_TO_CAMEL = {
    "allow_ai_reviewed_in_feed": "allowAiReviewedInFeed",
    "allow_flagged_in_feed": "allowFlaggedInFeed",
    "feed_ranking_mode": "feedRankingMode",
    "enabled_platforms": "enabledPlatforms",
    "score_impact_min": "scoreImpactMin",
    "score_impact_max": "scoreImpactMax",
    "upload_max_bytes": "uploadMaxBytes",
    "live_feed_enabled": "liveFeedEnabled",
    "dispute_threshold": "disputeThreshold",
    "duplicate_threshold": "duplicateThreshold",
    "single_report_delta_cap": "singleReportDeltaCap",
    "daily_profile_delta_cap": "dailyProfileDeltaCap",
    "report_cooldown_hours": "reportCooldownHours",
}


async def _count_pending_claims(db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(ClaimRequest)
        .where(ClaimRequest.status == ClaimRequestStatus.PENDING)
    )
    return result.scalar_one()


async def _count_pending_disputes(db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(Dispute)
        .where(
            Dispute.status.in_([DisputeStatus.PENDING, DisputeStatus.UNDER_REVIEW])
        )
    )
    return result.scalar_one()


@router.get(
    "/stats",
    response_model=SuccessEnvelope[dict],
    summary="Get admin stats",
)
async def get_admin_stats(
    current_user: User = Depends(require_moderator),
    db: AsyncSession = Depends(get_db),
):
    (
        total_users,
        active_users,
        total_accounts,
        accounts_by_status,
        reports_by_status,
        pending_claims,
        pending_disputes,
    ) = await asyncio.gather(
        user_repository.count_users(db),
        user_repository.count_active_users(db),
        account_repository.count_accounts(db),
        account_repository.count_by_status(db),
        report_repository.count_by_status(db),
        _count_pending_claims(db),
        _count_pending_disputes(db),
    )
    return success(
        {
            "users": {"total": total_users, "active": active_users},
            "accounts": {"total": total_accounts, "by_status": accounts_by_status},
            "reports": {
                "total": sum(reports_by_status.values()),
                "by_status": reports_by_status,
                "pending_count": reports_by_status["PENDING"],
            },
            "claims": {"pending": pending_claims},
            "disputes": {"pending": pending_disputes},
        }
    )


@router.get("/moderation")
async def list_moderation_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_moderator),
):
    requests, _cursor = await moderation_request_service.list_moderation_requests(
        db, limit=200, cursor=None
    )

    report_map: dict[UUID, object] = {}
    account_map: dict[UUID, object] = {}
    user_map: dict[UUID, object] = {}
    for req in requests:
        if req.report_id not in report_map:
            report_map[req.report_id] = await report_repository.get_by_id(
                db, req.report_id
            )
        if req.account_id not in account_map:
            account_map[req.account_id] = await account_repository.get_by_id(
                db, req.account_id
            )
        if req.requested_by not in user_map:
            user_map[req.requested_by] = await user_repository.get_by_id(
                db, req.requested_by
            )

    enriched = []
    for req in requests:
        item = _serialize_moderation_request(req)
        item["report"] = _serialize_report(report_map.get(req.report_id))
        item["account"] = _serialize_account(account_map.get(req.account_id))
        item["requester"] = _serialize_user(user_map.get(req.requested_by))
        enriched.append(item)

    return success({"moderation_requests": enriched})


@router.post("/moderation/{moderation_request_id}/decide")
async def decide_moderation(
    moderation_request_id: UUID,
    data: ModerationDecideRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_moderator),
):
    verdict_enum = ModerationRequestStatus[data.verdict]
    result = await moderation_request_service.decide_moderation_request(
        db, moderation_request_id, current_user.id, verdict_enum, data.note
    )
    return success({"moderation_request": _serialize_moderation_request(result)})


@router.get("/evidence")
async def list_evidence_proposals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_moderator),
):
    proposals, _cursor = await evidence_proposal_service.list_pending(
        db, limit=150, cursor=None
    )
    return success(
        {"evidence_proposals": [_serialize_evidence_proposal(p) for p in proposals]}
    )


@router.post("/evidence/{proposal_id}/decide")
async def decide_evidence(
    proposal_id: UUID,
    data: EvidenceDecideRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_moderator),
):
    status_enum = EvidenceProposalStatus[data.verdict]
    result = await evidence_proposal_service.decide_evidence_proposal(
        db, proposal_id, current_user.id, status_enum, data.note
    )
    if isinstance(result, dict):
        return success(
            {
                "proposal": _serialize_evidence_proposal(result["proposal"]),
                "report": _serialize_report(result["report"]),
                "account": _serialize_account(result["account"]),
            }
        )
    return success({"proposal": _serialize_evidence_proposal(result)})


@router.post("/accounts/{account_id}/evidence/scan", status_code=201)
async def scan_account_evidence(
    account_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_moderator),
):
    account = await account_repository.get_by_id(db, account_id)
    if account is None:
        raise_api_error("not_found", "Account not found")

    # TODO: wire scanPublicEvidence integration (Day 9 stretch)
    await admin_action_service.log_action(
        db,
        actor_user_id=current_user.id,
        action_type=AdminActionType.EVIDENCE_SCAN,
        target_type="account",
        target_id=account_id,
        metadata_json={"note": "scan_stubbed"},
    )
    return JSONResponse(
        status_code=201,
        content=success({"proposals": [], "account": _serialize_account(account)}),
    )


@router.post("/reports", status_code=201)
async def admin_create_report(
    data: AdminCreateReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    account = await account_repository.get_by_id(db, data.account_id)
    if account is None:
        raise_api_error("not_found", "Account not found")

    report = await report_repository.create(
        db,
        account_id=data.account_id,
        reporter_user_id=None,
        title=data.deed,
        description=data.description,
        report_type=data.type,
    )
    report.status = ReportStatus.APPROVED
    report.deed = data.deed
    report.base_score = data.base_score
    report.visibility = data.visibility
    report.pinned = data.pinned
    report.featured = data.featured
    report.ai_verdict = {
        "valid": True,
        "reasoning": data.note,
        "categoryTags": [data.deed],
        "proposedImpact": data.base_score / 10,
    }
    report.reviewed_at = datetime.now(timezone.utc)
    report.reviewed_by = current_user.id
    await db.flush()

    await apply_report_score(db, report, account, dict(DEFAULT_MULTIPLIERS))

    await admin_action_service.log_action(
        db,
        actor_user_id=current_user.id,
        action_type=AdminActionType.REPORT_CREATE,
        target_type="report",
        target_id=report.id,
        reason=data.note,
        metadata_json={"account_id": str(data.account_id), "deed": data.deed},
    )
    return JSONResponse(
        status_code=201,
        content=success(
            {
                "report": _serialize_report(report),
                "account": _serialize_account(account),
            }
        ),
    )


@router.patch("/reports/{report_id}")
async def admin_update_report(
    report_id: UUID,
    data: AdminUpdateReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    report = await report_repository.get_by_id(db, report_id)
    if report is None:
        raise_api_error("not_found", "Report not found")

    patch = data.model_dump(exclude_none=True)
    if not patch:
        raise_api_error("validation_error", "No fields to update")

    updated = await report_repository.update(db, report, **patch)
    await db.commit()

    await admin_action_service.log_action(
        db,
        actor_user_id=current_user.id,
        action_type=AdminActionType.REPORT_UPDATE,
        target_type="report",
        target_id=report_id,
        metadata_json=patch,
    )
    return success({"report": _serialize_report(updated)})


@router.delete("/reports/{report_id}")
async def admin_delete_report(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    report = await report_repository.get_by_id(db, report_id)
    if report is None:
        raise_api_error("not_found", "Report not found")

    await db.delete(report)
    await db.commit()

    await admin_action_service.log_action(
        db,
        actor_user_id=current_user.id,
        action_type=AdminActionType.REPORT_DELETE,
        target_type="report",
        target_id=report_id,
        metadata_json={"deleted_by": str(current_user.id)},
    )
    return success({"deleted": str(report_id)})


@router.get("/actions")
async def list_admin_actions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_moderator),
):
    actions = await admin_action_service.list_recent(db, limit=300)
    return success({"actions": [_serialize_admin_action(a) for a in actions]})


@router.get("/users")
async def admin_list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_moderator),
):
    users = await admin_user_service.list_users(db)
    return success({"users": [serialize_user(u) for u in users]})


@router.patch("/users/{user_id}")
async def admin_update_user(
    user_id: UUID,
    data: AdminUserUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    fields = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if not fields:
        raise_api_error("no_fields", "No fields to update")
    if "role" in fields:
        try:
            fields["role"] = UserRole(fields["role"])
        except ValueError:
            raise_api_error("validation_error", "Invalid role value")
    updated = await admin_user_service.update_user(
        db, user_id, current_user, **fields
    )
    return success({"user": serialize_user(updated)})


@router.delete("/users/{user_id}")
async def admin_delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    await admin_user_service.delete_user(db, user_id, current_user)
    return success({"deleted": str(user_id)})


@router.get("/accounts")
async def admin_list_accounts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_moderator),
):
    accounts = await admin_account_service.list_accounts(db)
    return success({"accounts": [serialize_account(a) for a in accounts]})


@router.post("/accounts", status_code=201)
async def admin_create_account(
    data: AdminAccountCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    account = await admin_account_service.create_account(
        db,
        current_user.id,
        data.platform,
        data.handle,
        data.display_name,
        data.bio,
    )
    return JSONResponse(
        status_code=201,
        content=success({"account": serialize_account(account)}),
    )


@router.patch("/accounts/{account_id}")
async def admin_update_account(
    account_id: UUID,
    data: AdminAccountUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    fields = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if not fields:
        raise_api_error("no_fields", "No fields to update")
    if "status" in fields:
        try:
            fields["status"] = AccountStatus(fields["status"])
        except ValueError:
            raise_api_error("validation_error", "Invalid status value")
    updated = await admin_account_service.update_account(
        db, account_id, current_user.id, **fields
    )
    return success({"account": serialize_account(updated)})


@router.delete("/accounts/{account_id}")
async def admin_delete_account(
    account_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    await admin_account_service.delete_account(db, account_id, current_user.id)
    return success({"deleted": str(account_id)})


@router.get("/settings")
async def admin_get_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_moderator),
):
    settings = await site_setting_service.get_settings(db)
    return success({"settings": settings})


@router.patch("/settings")
async def admin_update_settings(
    data: AdminSettingsPatchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    partial = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if not partial:
        raise_api_error("no_fields", "No settings to update")
    camel_partial = {
        _SETTINGS_SNAKE_TO_CAMEL[k]: v for k, v in partial.items()
    }
    updated = await site_setting_service.update_settings(db, camel_partial)
    await admin_action_service.log_action(
        db,
        actor_user_id=current_user.id,
        action_type=AdminActionType.SETTINGS_UPDATE,
        target_type="site_settings",
        target_id=current_user.id,
        metadata_json={"fields_changed": list(partial.keys())},
    )
    return success({"settings": updated})


@router.post("/ownership")
async def admin_assign_ownership(
    data: AdminOwnershipAssignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    result = await admin_ownership_service.assign_ownership(
        db, data.account_id, data.user_id, current_user.id
    )
    return success(
        {
            "account": serialize_account(result["account"]),
            "user": serialize_user(result["user"]),
        }
    )


@router.delete("/ownership")
async def admin_revoke_ownership(
    data: AdminOwnershipRevokeRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    result = await admin_ownership_service.revoke_ownership(
        db, data.account_id, current_user.id
    )
    return success({"account": serialize_account(result["account"])})


@router.post("/score/replay")
async def admin_score_replay(
    data: AdminScoreReplayRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    if data.account_id is not None:
        result = await admin_score_service.replay_account(
            db, data.account_id, current_user.id
        )
        return success({"account_results": [result], "user_results": []})
    result = await admin_score_service.replay_all(db, current_user.id)
    return success(
        {"account_results": result["account_results"], "user_results": []}
    )
