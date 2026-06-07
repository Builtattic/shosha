from __future__ import annotations

from math import ceil
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import raise_api_error
from app.models.bubble import Bubble, BubbleJoinRequest
from app.models.enums import BubbleJoinStatus, BubbleType
from app.models.user import User
from app.repositories import (
    add_bubble_member,
    create_bubble as repo_create_bubble,
    create_bubble_join_request,
    get_bubble_by_id,
    get_bubble_join_request,
    get_bubble_member,
    list_bubble_join_requests,
    list_bubble_members,
    list_bubbles_for_user,
    repo_list_bubbles,
    update_bubble_join_request,
)
from app.repositories.user_repository import get_by_username
from app.schemas.bubble import BubbleCreateRequest, VoteRequest
from app.services._helpers import is_admin, normalize_username


def approval_threshold(member_count: int) -> int:
    return max(1, ceil(member_count / 2))


async def list_bubbles(
    db: AsyncSession,
    limit: int,
    cursor: str | None,
) -> tuple[list[Bubble], str | None]:
    return await repo_list_bubbles(db, limit, cursor)


async def get_bubble(db: AsyncSession, bubble_id: UUID) -> Bubble:
    bubble = await get_bubble_by_id(db, bubble_id)
    if bubble is None:
        raise_api_error("not_found", "Bubble not found")
    return bubble


async def create_bubble(
    db: AsyncSession,
    data: BubbleCreateRequest,
    current_user: User,
) -> Bubble:
    if data.bubble_type == BubbleType.COLLEGE_GROUP and not is_admin(current_user):
        raise_api_error(
            "forbidden",
            "College bubbles must be created by an admin profile.",
        )

    bubble = await repo_create_bubble(
        db,
        name=data.name,
        tagline=data.tagline,
        description=data.description,
        bubble_type=data.bubble_type,
        category=data.category,
        cover_image_url=data.cover_image_url,
        image_url=data.image_url,
        created_by=current_user.id,
        is_admin_created=is_admin(current_user),
        visibility=data.visibility,
    )

    if data.invited_usernames:
        unique_usernames = {
            normalize_username(name)
            for name in data.invited_usernames
            if normalize_username(name)
        }
        for username in unique_usernames:
            invitee = await get_by_username(db, username)
            if invitee is not None and invitee.id != current_user.id:
                await create_bubble_join_request(db, bubble.id, invitee.id)

    await db.commit()
    loaded = await get_bubble_by_id(db, bubble.id)
    assert loaded is not None
    return loaded


async def get_my_bubbles(
    db: AsyncSession,
    current_user: User,
    limit: int,
    cursor: str | None,
) -> tuple[list[Bubble], str | None]:
    return await list_bubbles_for_user(db, current_user.id, limit, cursor)


async def join_bubble(
    db: AsyncSession,
    bubble_id: UUID,
    current_user: User,
) -> BubbleJoinRequest:
    bubble = await get_bubble_by_id(db, bubble_id)
    if bubble is None:
        raise_api_error("not_found", "Bubble not found")

    if await get_bubble_member(db, bubble_id, current_user.id) is not None:
        raise_api_error("conflict", "You are already a member of this bubble")

    existing = await get_bubble_join_request(db, bubble_id, current_user.id)
    if existing is not None and existing.status == BubbleJoinStatus.PENDING:
        raise_api_error("conflict", "You already have a pending join request for this bubble")

    request = await create_bubble_join_request(db, bubble_id, current_user.id)
    await db.commit()
    await db.refresh(request)
    return request


async def vote_join_request(
    db: AsyncSession,
    bubble_id: UUID,
    target_user_id: UUID,
    vote: VoteRequest,
    current_user: User,
) -> BubbleJoinRequest:
    request = await get_bubble_join_request(db, bubble_id, target_user_id)
    if request is None:
        raise_api_error("not_found", "Join request not found")

    members = await list_bubble_members(db, bubble_id)
    if not any(member.user_id == current_user.id for member in members):
        raise_api_error("forbidden", "Only bubble members can vote on join requests")

    voter_id = str(current_user.id)
    approvals = set(str(item) for item in (request.approvals or []))
    rejections = set(str(item) for item in (request.rejections or []))
    approvals.discard(voter_id)
    rejections.discard(voter_id)
    if vote.vote == "approve":
        approvals.add(voter_id)
    else:
        rejections.add(voter_id)

    threshold = approval_threshold(len(members))
    if len(approvals) >= threshold:
        status = BubbleJoinStatus.APPROVED
    elif len(rejections) >= threshold:
        status = BubbleJoinStatus.REJECTED
    else:
        status = BubbleJoinStatus.PENDING

    updated = await update_bubble_join_request(
        db,
        request,
        status,
        list(approvals),
        list(rejections),
    )

    if status == BubbleJoinStatus.APPROVED:
        if await get_bubble_member(db, bubble_id, target_user_id) is None:
            await add_bubble_member(db, bubble_id, target_user_id)

    await db.commit()
    await db.refresh(updated)
    return updated


async def list_join_requests(
    db: AsyncSession,
    bubble_id: UUID,
    current_user: User,
) -> list[BubbleJoinRequest]:
    if await get_bubble_member(db, bubble_id, current_user.id) is None:
        raise_api_error("forbidden", "Only bubble members can view join requests")
    return await list_bubble_join_requests(db, bubble_id)
