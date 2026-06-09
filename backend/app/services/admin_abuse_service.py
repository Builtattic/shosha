from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import raise_api_error
from app.models.enums import AdminActionType, NotificationType
from app.models.report import Report
from app.repositories import account_repository, notification_repository, report_repository
from app.services import admin_action_service


def _iso(value) -> str | None:
    return value.isoformat() if value is not None else None


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


def _serialize_report(report: Report) -> dict:
    return {
        "id": str(report.id),
        "account_id": str(report.account_id),
        "reporter_user_id": (
            str(report.reporter_user_id) if report.reporter_user_id else None
        ),
        "title": report.title,
        "description": report.description,
        "status": report.status.value,
        "report_type": report.report_type,
        "ai_verdict": report.ai_verdict,
        "created_at": _iso(report.created_at),
        "updated_at": _iso(report.updated_at),
    }


def _has_abuse_flags(report: Report) -> bool:
    verdict = report.ai_verdict
    if not isinstance(verdict, dict):
        return False
    flags = verdict.get("abuseFlags", [])
    return isinstance(flags, list) and len(flags) > 0


async def list_flagged(db: AsyncSession) -> list[dict]:
    reports, _cursor = await report_repository.list_reports(
        db,
        account_id=None,
        status=None,
        limit=500,
        cursor=None,
    )
    flagged = [report for report in reports if _has_abuse_flags(report)][:100]
    enriched: list[dict] = []
    for report in flagged:
        account = await account_repository.get_by_id(db, report.account_id)
        enriched.append(
            {
                **_serialize_report(report),
                "account": _serialize_account(account),
            }
        )
    return enriched


async def dismiss_abuse(
    db: AsyncSession,
    report_id: UUID,
    actor_id: UUID,
) -> Report:
    report = await report_repository.get_by_id(db, report_id)
    if report is None:
        raise_api_error("not_found", "Report not found")

    existing_verdict = report.ai_verdict if isinstance(report.ai_verdict, dict) else {}
    new_verdict = {**existing_verdict, "abuseFlags": []}
    report = await report_repository.update(db, report, ai_verdict=new_verdict)
    await db.commit()
    await db.refresh(report)

    if report.reporter_user_id is not None:
        await notification_repository.create(
            db,
            user_id=report.reporter_user_id,
            notification_type=NotificationType.SYSTEM,
            title="Abuse flag reviewed",
            message="An abuse flag on your report has been reviewed and cleared.",
            metadata_json={"report_id": str(report_id)},
        )
        await db.commit()

    await admin_action_service.log_action(
        db,
        actor_user_id=actor_id,
        action_type=AdminActionType.ABUSE_DISMISS,
        target_type="report",
        target_id=report_id,
        metadata_json={"actor_id": str(actor_id)},
    )

    return report
