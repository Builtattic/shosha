from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import ModerationRequestStatus
from app.models.moderation_request import ModerationRequest
from app.repositories._pagination import (
    apply_created_at_cursor,
    build_next_cursor,
    decode_cursor,
)


async def create(
    db: AsyncSession,
    report_id: UUID,
    account_id: UUID,
    requested_by: UUID,
    reason: str,
    evidence_links: list | None = None,
) -> ModerationRequest:
    moderation_request = ModerationRequest(
        report_id=report_id,
        account_id=account_id,
        requested_by=requested_by,
        reason=reason,
        evidence_links=evidence_links if evidence_links is not None else [],
    )
    db.add(moderation_request)
    await db.flush()
    await db.refresh(moderation_request)
    return moderation_request


async def get_by_id(db: AsyncSession, moderation_request_id: UUID) -> ModerationRequest | None:
    result = await db.execute(
        select(ModerationRequest).where(ModerationRequest.id == moderation_request_id)
    )
    return result.scalar_one_or_none()


async def get_pending_by_report(db: AsyncSession, report_id: UUID) -> ModerationRequest | None:
    result = await db.execute(
        select(ModerationRequest).where(
            ModerationRequest.report_id == report_id,
            ModerationRequest.status == ModerationRequestStatus.PENDING,
        )
    )
    return result.scalars().first()


async def update(db: AsyncSession, obj: ModerationRequest, **kwargs) -> ModerationRequest:
    for key, value in kwargs.items():
        setattr(obj, key, value)
    await db.flush()
    await db.refresh(obj)
    return obj


async def list_by_report(db: AsyncSession, report_id: UUID) -> list[ModerationRequest]:
    result = await db.execute(
        select(ModerationRequest)
        .where(ModerationRequest.report_id == report_id)
        .order_by(ModerationRequest.created_at.desc(), ModerationRequest.id.desc())
    )
    return list(result.scalars().all())


async def list_all(
    db: AsyncSession,
    limit: int = 50,
    cursor: str | None = None,
) -> tuple[list[ModerationRequest], str | None]:
    stmt = apply_created_at_cursor(
        select(ModerationRequest),
        ModerationRequest.created_at,
        decode_cursor(cursor),
        descending=True,
    )
    stmt = stmt.order_by(
        ModerationRequest.created_at.desc(),
        ModerationRequest.id.desc(),
    ).limit(limit + 1)
    result = await db.execute(stmt)
    return build_next_cursor(list(result.scalars().all()), limit)


async def list_by_status(
    db: AsyncSession,
    status: ModerationRequestStatus,
    limit: int = 50,
    cursor: str | None = None,
) -> tuple[list[ModerationRequest], str | None]:
    stmt = select(ModerationRequest).where(ModerationRequest.status == status)
    stmt = apply_created_at_cursor(
        stmt, ModerationRequest.created_at, decode_cursor(cursor), descending=True
    )
    stmt = stmt.order_by(
        ModerationRequest.created_at.desc(),
        ModerationRequest.id.desc(),
    ).limit(limit + 1)
    result = await db.execute(stmt)
    return build_next_cursor(list(result.scalars().all()), limit)
