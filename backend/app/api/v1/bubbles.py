from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.responses import success
from app.models.bubble import Bubble
from app.models.user import User
from app.schemas.bubble import (
    BubbleCreateRequest,
    BubbleDetailOut,
    BubbleMemberOut,
    BubbleOut,
    JoinRequestOut,
    VoteRequest,
)
from app.schemas.common import PaginatedResponse, SuccessEnvelope
from app.services.bubble_service import (
    create_bubble,
    get_bubble,
    get_my_bubbles,
    join_bubble,
    list_bubbles,
    list_join_requests,
    vote_join_request,
)

router = APIRouter()


def _bubble_out(bubble: Bubble) -> dict:
    data = BubbleOut.model_validate(bubble).model_dump(mode="json")
    data["member_count"] = len(bubble.members)
    return data


def _bubble_detail_out(bubble: Bubble) -> dict:
    data = BubbleDetailOut.model_validate(bubble).model_dump(mode="json")
    data["member_count"] = len(bubble.members)
    data["members"] = [
        BubbleMemberOut.model_validate(m).model_dump(mode="json") for m in bubble.members
    ]
    return data


def _serialize_bubbles(items: list[Bubble]) -> list[dict]:
    return [_bubble_out(b) for b in items]


def _serialize_join_requests(items: list) -> list[dict]:
    return [JoinRequestOut.model_validate(r).model_dump(mode="json") for r in items]


@router.get(
    "/",
    response_model=SuccessEnvelope[PaginatedResponse[BubbleOut]],
    summary="List public bubbles",
)
async def get_bubbles_list(
    limit: int = Query(default=50, ge=1, le=100),
    cursor: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    items, next_cursor = await list_bubbles(db, limit, cursor)
    return success({"items": _serialize_bubbles(items), "next_cursor": next_cursor})


@router.post(
    "/",
    response_model=SuccessEnvelope[dict],
    summary="Create a bubble",
)
async def post_bubble(
    body: BubbleCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    bubble = await create_bubble(db, body, current_user)
    return success({"bubble": _bubble_detail_out(bubble)})


@router.get(
    "/mine",
    response_model=SuccessEnvelope[PaginatedResponse[BubbleOut]],
    summary="List bubbles I belong to",
)
async def get_bubbles_mine(
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, next_cursor = await get_my_bubbles(db, current_user, limit, cursor)
    return success({"items": _serialize_bubbles(items), "next_cursor": next_cursor})


# TODO: add denormalized score/member_count to bubbles table for proper leaderboard
@router.get(
    "/leaderboard",
    response_model=SuccessEnvelope[dict],
    summary="Bubble leaderboard",
)
async def get_bubbles_leaderboard(
    limit: int = Query(default=10, ge=1, le=50),
    sort_by: str = Query(default="score"),
    db: AsyncSession = Depends(get_db),
):
    items, _ = await list_bubbles(db, limit=100, cursor=None)
    if sort_by == "members":
        items.sort(key=lambda b: len(b.members), reverse=True)
    else:
        items.sort(key=lambda b: b.created_at, reverse=True)
    return success({"items": _serialize_bubbles(items[:limit])})


@router.get(
    "/{bubble_id}",
    response_model=SuccessEnvelope[dict],
    summary="Get bubble by ID",
)
async def get_bubble_by_id_route(
    bubble_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    bubble = await get_bubble(db, bubble_id)
    return success({"bubble": _bubble_detail_out(bubble)})


@router.post(
    "/{bubble_id}/join",
    response_model=SuccessEnvelope[dict],
    summary="Request to join a bubble",
)
async def post_bubble_join(
    bubble_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    request = await join_bubble(db, bubble_id, current_user)
    return success(
        {"request": JoinRequestOut.model_validate(request).model_dump(mode="json")}
    )


@router.get(
    "/{bubble_id}/join-requests",
    response_model=SuccessEnvelope[dict],
    summary="List join requests for a bubble",
)
async def get_bubble_join_requests(
    bubble_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    requests = await list_join_requests(db, bubble_id, current_user)
    return success({"requests": _serialize_join_requests(requests)})


@router.post(
    "/{bubble_id}/join-requests/{target_user_id}/vote",
    response_model=SuccessEnvelope[dict],
    summary="Vote on a join request",
)
async def post_bubble_join_request_vote(
    bubble_id: UUID,
    target_user_id: UUID,
    body: VoteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    request = await vote_join_request(
        db, bubble_id, target_user_id, body, current_user
    )
    return success(
        {"request": JoinRequestOut.model_validate(request).model_dump(mode="json")}
    )
