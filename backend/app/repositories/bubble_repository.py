from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.bubble import Bubble, BubbleJoinRequest, BubbleMember
from app.models.enums import BubbleJoinStatus, BubbleMemberRole, BubbleType, BubbleVisibility
from app.repositories._pagination import (
    apply_created_at_cursor,
    build_next_cursor,
    decode_cursor,
)

_BUBBLE_LIST_OPTIONS = (selectinload(Bubble.members),)
_BUBBLE_DETAIL_OPTIONS = (
    selectinload(Bubble.members),
    selectinload(Bubble.join_requests),
)


async def get_by_id(db: AsyncSession, bubble_id: UUID) -> Bubble | None:
    result = await db.execute(
        select(Bubble)
        .where(Bubble.id == bubble_id)
        .options(*_BUBBLE_DETAIL_OPTIONS)
    )
    return result.scalar_one_or_none()


async def list_bubbles(
    db: AsyncSession,
    limit: int = 50,
    cursor: str | None = None,
) -> tuple[list[Bubble], str | None]:
    stmt = select(Bubble).where(Bubble.visibility == BubbleVisibility.PUBLIC)
    stmt = apply_created_at_cursor(
        stmt, Bubble.created_at, decode_cursor(cursor), descending=True
    )
    stmt = (
        stmt.options(*_BUBBLE_LIST_OPTIONS)
        .order_by(Bubble.created_at.desc(), Bubble.id.desc())
        .limit(limit + 1)
    )
    result = await db.execute(stmt)
    return build_next_cursor(list(result.scalars().unique().all()), limit)


async def list_for_user(
    db: AsyncSession,
    user_id: UUID,
    limit: int = 20,
    cursor: str | None = None,
) -> tuple[list[Bubble], str | None]:
    stmt = (
        select(Bubble)
        .join(BubbleMember, BubbleMember.bubble_id == Bubble.id)
        .where(BubbleMember.user_id == user_id)
    )
    stmt = apply_created_at_cursor(
        stmt, Bubble.created_at, decode_cursor(cursor), descending=True
    )
    stmt = (
        stmt.options(*_BUBBLE_LIST_OPTIONS)
        .order_by(Bubble.created_at.desc(), Bubble.id.desc())
        .limit(limit + 1)
    )
    result = await db.execute(stmt)
    return build_next_cursor(list(result.scalars().unique().all()), limit)


async def create(
    db: AsyncSession,
    name: str,
    tagline: str | None,
    description: str,
    bubble_type: BubbleType,
    category: str | None,
    cover_image_url: str | None,
    image_url: str | None,
    created_by: UUID,
    is_admin_created: bool,
    visibility: BubbleVisibility,
) -> Bubble:
    now = datetime.now(timezone.utc)
    bubble = Bubble(
        name=name,
        tagline=tagline,
        description=description,
        bubble_type=bubble_type,
        category=category,
        cover_image_url=cover_image_url,
        image_url=image_url,
        created_by=created_by,
        is_admin_created=is_admin_created,
        visibility=visibility,
    )
    db.add(bubble)
    await db.flush()

    owner_member = BubbleMember(
        bubble_id=bubble.id,
        user_id=created_by,
        role=BubbleMemberRole.OWNER,
        score=0.0,
        joined_at=now,
    )
    db.add(owner_member)
    await db.flush()
    await db.refresh(bubble)
    return bubble


async def get_member(
    db: AsyncSession,
    bubble_id: UUID,
    user_id: UUID,
) -> BubbleMember | None:
    result = await db.execute(
        select(BubbleMember).where(
            BubbleMember.bubble_id == bubble_id,
            BubbleMember.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def list_members(db: AsyncSession, bubble_id: UUID) -> list[BubbleMember]:
    result = await db.execute(
        select(BubbleMember)
        .where(BubbleMember.bubble_id == bubble_id)
        .order_by(BubbleMember.score.desc())
    )
    return list(result.scalars().all())


async def add_member(
    db: AsyncSession,
    bubble_id: UUID,
    user_id: UUID,
    role: BubbleMemberRole = BubbleMemberRole.MEMBER,
) -> BubbleMember:
    now = datetime.now(timezone.utc)
    member = BubbleMember(
        bubble_id=bubble_id,
        user_id=user_id,
        role=role,
        score=0.0,
        joined_at=now,
    )
    db.add(member)
    await db.flush()
    await db.refresh(member)
    return member


async def get_join_request(
    db: AsyncSession,
    bubble_id: UUID,
    user_id: UUID,
) -> BubbleJoinRequest | None:
    result = await db.execute(
        select(BubbleJoinRequest).where(
            BubbleJoinRequest.bubble_id == bubble_id,
            BubbleJoinRequest.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def list_join_requests(
    db: AsyncSession,
    bubble_id: UUID,
) -> list[BubbleJoinRequest]:
    result = await db.execute(
        select(BubbleJoinRequest)
        .where(BubbleJoinRequest.bubble_id == bubble_id)
        .order_by(BubbleJoinRequest.created_at.desc())
    )
    return list(result.scalars().all())


async def create_join_request(
    db: AsyncSession,
    bubble_id: UUID,
    user_id: UUID,
) -> BubbleJoinRequest:
    request = BubbleJoinRequest(
        bubble_id=bubble_id,
        user_id=user_id,
        status=BubbleJoinStatus.PENDING,
        approvals=[],
        rejections=[],
    )
    db.add(request)
    await db.flush()
    await db.refresh(request)
    return request


async def update_join_request(
    db: AsyncSession,
    request: BubbleJoinRequest,
    status: BubbleJoinStatus,
    approvals: list,
    rejections: list,
) -> BubbleJoinRequest:
    request.status = status
    request.approvals = approvals
    request.rejections = rejections
    await db.flush()
    await db.refresh(request)
    return request
