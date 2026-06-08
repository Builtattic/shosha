from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.deletion_request import DeletionRequest
from app.models.enums import DeletionRequestStatus
from app.repositories._pagination import (
    apply_created_at_cursor,
    build_next_cursor,
    decode_cursor,
)


async def create(db: AsyncSession, **kwargs) -> DeletionRequest:
    deletion_request = DeletionRequest(**kwargs)
    db.add(deletion_request)
    await db.flush()
    await db.refresh(deletion_request)
    return deletion_request


async def get_by_id(db: AsyncSession, deletion_request_id: UUID) -> DeletionRequest | None:
    result = await db.execute(
        select(DeletionRequest).where(DeletionRequest.id == deletion_request_id)
    )
    return result.scalar_one_or_none()


async def update(db: AsyncSession, obj: DeletionRequest, **kwargs) -> DeletionRequest:
    for key, value in kwargs.items():
        setattr(obj, key, value)
    await db.flush()
    await db.refresh(obj)
    return obj


async def list_by_user(
    db: AsyncSession,
    user_id: UUID,
    limit: int = 5,
) -> list[DeletionRequest]:
    result = await db.execute(
        select(DeletionRequest)
        .where(DeletionRequest.user_id == user_id)
        .order_by(DeletionRequest.created_at.desc(), DeletionRequest.id.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def list_pending(
    db: AsyncSession,
    limit: int = 50,
    cursor: str | None = None,
) -> tuple[list[DeletionRequest], str | None]:
    stmt = select(DeletionRequest).where(
        DeletionRequest.status == DeletionRequestStatus.PENDING
    )
    stmt = apply_created_at_cursor(
        stmt, DeletionRequest.created_at, decode_cursor(cursor), descending=True
    )
    stmt = stmt.order_by(
        DeletionRequest.created_at.desc(),
        DeletionRequest.id.desc(),
    ).limit(limit + 1)
    result = await db.execute(stmt)
    return build_next_cursor(list(result.scalars().all()), limit)


async def list_all(
    db: AsyncSession,
    limit: int = 50,
    cursor: str | None = None,
) -> tuple[list[DeletionRequest], str | None]:
    stmt = apply_created_at_cursor(
        select(DeletionRequest),
        DeletionRequest.created_at,
        decode_cursor(cursor),
        descending=True,
    )
    stmt = stmt.order_by(
        DeletionRequest.created_at.desc(),
        DeletionRequest.id.desc(),
    ).limit(limit + 1)
    result = await db.execute(stmt)
    return build_next_cursor(list(result.scalars().all()), limit)
