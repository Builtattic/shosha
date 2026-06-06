from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_moderator
from app.core.responses import success
from app.models.user import User
from app.schemas.common import PaginatedResponse, SuccessEnvelope
from app.schemas.dispute import (
    DisputeCreateRequest,
    DisputeDecisionRequest,
    DisputeOut,
)
from app.services import (
    decide_dispute,
    file_dispute,
    get_dispute,
    get_my_disputes,
    get_pending_disputes,
    withdraw_dispute,
)

router = APIRouter()


def _serialize_disputes(items: list) -> list[dict]:
    return [DisputeOut.model_validate(d).model_dump(mode="json") for d in items]


@router.post(
    "/",
    response_model=SuccessEnvelope[dict],
    summary="File a dispute",
)
async def post_dispute(
    body: DisputeCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    dispute = await file_dispute(db, body, current_user)
    return success(
        {"dispute": DisputeOut.model_validate(dispute).model_dump(mode="json")}
    )


@router.get(
    "/mine",
    response_model=SuccessEnvelope[PaginatedResponse[DisputeOut]],
    summary="List my disputes",
)
async def get_disputes_mine(
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, next_cursor = await get_my_disputes(db, current_user, limit, cursor)
    return success({"items": _serialize_disputes(items), "next_cursor": next_cursor})


@router.get(
    "/pending",
    response_model=SuccessEnvelope[PaginatedResponse[DisputeOut]],
    summary="List pending disputes",
)
async def get_disputes_pending(
    limit: int = Query(default=50, ge=1, le=100),
    cursor: str | None = Query(default=None),
    current_user: User = Depends(require_moderator),
    db: AsyncSession = Depends(get_db),
):
    items, next_cursor = await get_pending_disputes(db, current_user, limit, cursor)
    return success({"items": _serialize_disputes(items), "next_cursor": next_cursor})


@router.get(
    "/{dispute_id}",
    response_model=SuccessEnvelope[dict],
    summary="Get dispute by ID",
)
async def get_dispute_by_id(
    dispute_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    dispute = await get_dispute(db, dispute_id, current_user)
    return success(
        {"dispute": DisputeOut.model_validate(dispute).model_dump(mode="json")}
    )


@router.post(
    "/{dispute_id}/decide",
    response_model=SuccessEnvelope[dict],
    summary="Accept or reject a dispute",
)
async def post_dispute_decide(
    dispute_id: UUID,
    body: DisputeDecisionRequest,
    current_user: User = Depends(require_moderator),
    db: AsyncSession = Depends(get_db),
):
    dispute = await decide_dispute(db, dispute_id, body, current_user)
    return success(
        {"dispute": DisputeOut.model_validate(dispute).model_dump(mode="json")}
    )


@router.post(
    "/{dispute_id}/withdraw",
    response_model=SuccessEnvelope[dict],
    summary="Withdraw a dispute",
)
async def post_dispute_withdraw(
    dispute_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    dispute = await withdraw_dispute(db, dispute_id, current_user)
    return success(
        {"dispute": DisputeOut.model_validate(dispute).model_dump(mode="json")}
    )
