from __future__ import annotations

import asyncio
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import raise_api_error
from app.integrations.gemini import run_full_audit
from app.models.account import Account
from app.models.audit_request import AuditRequest
from app.models.enums import AdminActionType, AuditRequestStatus, ReportStatus
from app.models.user import User
from app.repositories import (
    account_repository,
    audit_request_repository,
    report_repository,
    user_repository,
)
from app.services import admin_action_service


def _iso(value) -> str | None:
    return value.isoformat() if value is not None else None


def _serialize_audit(audit: AuditRequest) -> dict:
    return {
        "id": str(audit.id),
        "user_id": str(audit.user_id),
        "account_id": str(audit.account_id),
        "reason": audit.reason,
        "status": audit.status.value,
        "created_at": _iso(audit.created_at),
        "updated_at": _iso(audit.updated_at),
    }


def _serialize_user(user: User | None) -> dict | None:
    if user is None:
        return None
    return {
        "id": str(user.id),
        "username": user.username,
        "display_name": user.display_name,
        "photo_url": user.photo_url,
    }


def _serialize_account(account: Account | None) -> dict | None:
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


def _serialize_report(report) -> dict:
    return {
        "id": str(report.id),
        "title": report.title,
        "description": report.description,
        "status": report.status.value,
        "report_type": report.report_type,
        "deed": report.deed,
        "base_score": report.base_score,
        "ai_verdict": report.ai_verdict,
        "created_at": _iso(report.created_at),
    }


async def list_pending(db: AsyncSession) -> list[dict]:
    audits, _cursor = await audit_request_repository.list_open(
        db, limit=100, cursor=None
    )
    enriched: list[dict] = []
    for audit in audits:
        account, user = await asyncio.gather(
            account_repository.get_by_id(db, audit.account_id),
            user_repository.get_by_id(db, audit.user_id),
        )
        enriched.append(
            {
                **_serialize_audit(audit),
                "account": _serialize_account(account),
                "user": _serialize_user(user),
            }
        )
    return enriched


async def run_audit(
    db: AsyncSession,
    audit_request_id: UUID,
    actor_id: UUID,
) -> dict:
    audit = await audit_request_repository.get_by_id(db, audit_request_id)
    if audit is None:
        raise_api_error("not_found", "Audit request not found")

    account = await account_repository.get_by_id(db, audit.account_id)
    if account is None:
        raise_api_error("not_found", "Account not found")

    await audit_request_repository.update(
        db, audit, status=AuditRequestStatus.IN_PROGRESS
    )
    await db.commit()
    await db.refresh(audit)

    approved_reports, _cursor = await report_repository.list_reports(
        db,
        account.id,
        ReportStatus.APPROVED,
        limit=200,
        cursor=None,
    )
    report_dicts = [_serialize_report(report) for report in approved_reports]

    result = await run_full_audit(
        {
            "score": account.score,
            "displayName": account.display_name or account.handle,
            "platform": account.platform,
            "breakdown": account.score_breakdown or {},
        },
        report_dicts,
        recent_posts=[],
    )

    account = await account_repository.update(
        db,
        account,
        score=float(result["newScore"]),
        score_breakdown=result["breakdown"],
    )
    await db.commit()
    await db.refresh(account)

    audit = await audit_request_repository.update(
        db, audit, status=AuditRequestStatus.COMPLETED
    )
    await db.commit()
    await db.refresh(audit)

    summary = result["summary"]
    await admin_action_service.log_action(
        db,
        actor_user_id=actor_id,
        action_type=AdminActionType.AUDIT_RUN,
        target_type="audit_request",
        target_id=audit_request_id,
        metadata_json={
            "account_id": str(account.id),
            "new_score": result["newScore"],
            "summary": summary[:200],
        },
    )

    return {
        "audit": _serialize_audit(audit),
        "account": _serialize_account(account),
        "summary": summary,
    }


async def decide_audit(
    db: AsyncSession,
    audit_request_id: UUID,
    actor_id: UUID,
    verdict: str,
    note: str | None = None,
) -> AuditRequest:
    _ = note
    if verdict not in ("completed", "rejected"):
        raise_api_error("validation_error", "verdict must be completed or rejected")

    audit = await audit_request_repository.get_by_id(db, audit_request_id)
    if audit is None:
        raise_api_error("not_found", "Audit request not found")

    status = (
        AuditRequestStatus.COMPLETED
        if verdict == "completed"
        else AuditRequestStatus.REJECTED
    )
    audit = await audit_request_repository.update(db, audit, status=status)
    await db.commit()
    await db.refresh(audit)

    await admin_action_service.log_action(
        db,
        actor_user_id=actor_id,
        action_type=AdminActionType.AUDIT_DECIDE,
        target_type="audit_request",
        target_id=audit_request_id,
        metadata_json={"verdict": verdict},
    )

    return audit
