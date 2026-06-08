from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import raise_api_error
from app.models.enums import ReportStatus
from app.models.event import Event
from app.repositories import event_repository as repo

_DECISION_STATUSES = (ReportStatus.APPROVED, ReportStatus.REJECTED)


async def create_event(
    db: AsyncSession,
    subject_account_id: UUID,
    event_type: str,
    description: str,
    **kwargs,
) -> Event:
    duplicate = await repo.find_duplicate(db, subject_account_id, description)
    if duplicate is not None:
        raise_api_error(
            "conflict", "A matching event was already submitted in the last 24 hours"
        )
    event = await repo.create(
        db,
        subject_account_id=subject_account_id,
        event_type=event_type,
        description=description,
        **kwargs,
    )
    await db.commit()
    await db.refresh(event)
    return event


async def list_for_account(
    db: AsyncSession,
    account_id: UUID,
    limit: int,
    cursor: str | None,
) -> tuple[list[Event], str | None]:
    return await repo.list_for_account(db, account_id, limit, cursor)


async def list_public_feed(
    db: AsyncSession,
    limit: int,
    cursor: str | None,
) -> tuple[list[Event], str | None]:
    return await repo.list_public_feed(db, limit, cursor)


async def list_pending(
    db: AsyncSession,
    limit: int,
    cursor: str | None,
) -> tuple[list[Event], str | None]:
    return await repo.list_pending(db, limit, cursor)


async def decide_event(
    db: AsyncSession,
    event_id: UUID,
    reviewer_id: UUID,
    status: ReportStatus,
    note: str | None = None,
) -> Event:
    if status not in _DECISION_STATUSES:
        raise_api_error("validation_error", "Decision must be APPROVED or REJECTED")

    event = await repo.get_by_id(db, event_id)
    if event is None:
        raise_api_error("not_found", "Event not found")

    admin_decision = {
        "verdict": status.value,
        "note": note,
        "decidedAt": datetime.now(timezone.utc).isoformat(),
        "decidedBy": str(reviewer_id),
    }
    updated = await repo.update(
        db,
        event,
        status=status,
        admin_decision=admin_decision,
    )
    await db.commit()
    await db.refresh(updated)
    return updated


async def delete_event(db: AsyncSession, event_id: UUID, actor_id: UUID) -> None:
    event = await repo.get_by_id(db, event_id)
    if event is None:
        raise_api_error("not_found", "Event not found")
    await repo.delete_by_id(db, event_id)
    await db.commit()
