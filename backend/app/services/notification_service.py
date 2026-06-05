from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import raise_api_error
from app.models.account import Account
from app.models.enums import NotificationType, ReportStatus
from app.models.notification import Notification
from app.models.report import Report
from app.models.user import User
from app.repositories import (
    count_unread_notifications,
    create_notification,
    list_notifications_for_user,
    mark_all_notifications_read as repo_mark_all_read,
    mark_notification_read as repo_mark_read,
)


async def get_notifications(
    db: AsyncSession,
    current_user: User,
    limit: int,
    cursor: str | None,
) -> tuple[list[Notification], str | None]:
    return await list_notifications_for_user(db, current_user.id, limit, cursor)


async def mark_notification_read(
    db: AsyncSession,
    notification_id: UUID,
    current_user: User,
) -> Notification:
    notification = await repo_mark_read(db, notification_id, current_user.id)
    if notification is None:
        raise_api_error("not_found", "Notification not found")
    await db.commit()
    await db.refresh(notification)
    return notification


async def mark_all_notifications_read(
    db: AsyncSession,
    current_user: User,
) -> dict:
    updated = await repo_mark_all_read(db, current_user.id)
    await db.commit()
    return {"updated": updated}


async def get_unread_count(db: AsyncSession, current_user: User) -> dict:
    count = await count_unread_notifications(db, current_user.id)
    return {"count": count}


async def emit_report_notification(
    db: AsyncSession,
    report: Report,
    account: Account,
    new_status: ReportStatus,
    reviewer: User,
) -> None:
    _ = reviewer
    if report.reporter_user_id is None:
        return
    if new_status == ReportStatus.REMOVED:
        return

    subject = account.display_name or account.handle
    if new_status == ReportStatus.APPROVED:
        title = "Your report was approved"
        message = f"Your report on {subject} was approved."
        notification_type = NotificationType.REPORT
    elif new_status == ReportStatus.REJECTED:
        title = "Your report was not approved"
        message = f"Your report on {subject} was not approved."
        notification_type = NotificationType.REPORT
    else:
        return

    await create_notification(
        db,
        report.reporter_user_id,
        notification_type,
        title,
        message,
        metadata_json={
            "report_id": str(report.id),
            "account_id": str(account.id),
        },
    )
