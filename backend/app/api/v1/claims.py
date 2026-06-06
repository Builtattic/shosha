from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_moderator
from app.core.responses import success
from app.models.user import User
from app.schemas.claim import ClaimCreateRequest, ClaimDecisionRequest, ClaimOut
from app.schemas.common import PaginatedResponse, SuccessEnvelope
from app.services import (
    decide_claim,
    get_claim,
    get_my_claims,
    get_pending_claims,
    submit_claim,
)

router = APIRouter()


def _serialize_claims(items: list) -> list[dict]:
    return [ClaimOut.model_validate(c).model_dump(mode="json") for c in items]


@router.post(
    "/",
    response_model=SuccessEnvelope[dict],
    summary="Submit a claim request",
)
async def post_claim(
    body: ClaimCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    claim = await submit_claim(db, body, current_user)
    return success(
        {"claim": ClaimOut.model_validate(claim).model_dump(mode="json")}
    )


@router.get(
    "/mine",
    response_model=SuccessEnvelope[PaginatedResponse[ClaimOut]],
    summary="List my claim requests",
)
async def get_claims_mine(
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, next_cursor = await get_my_claims(db, current_user, limit, cursor)
    return success({"items": _serialize_claims(items), "next_cursor": next_cursor})


@router.get(
    "/pending",
    response_model=SuccessEnvelope[PaginatedResponse[ClaimOut]],
    summary="List pending claim requests",
)
async def get_claims_pending(
    limit: int = Query(default=50, ge=1, le=100),
    cursor: str | None = Query(default=None),
    current_user: User = Depends(require_moderator),
    db: AsyncSession = Depends(get_db),
):
    items, next_cursor = await get_pending_claims(db, current_user, limit, cursor)
    return success({"items": _serialize_claims(items), "next_cursor": next_cursor})


@router.get(
    "/{claim_id}",
    response_model=SuccessEnvelope[dict],
    summary="Get claim request by ID",
)
async def get_claim_by_id(
    claim_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    claim = await get_claim(db, claim_id, current_user)
    return success(
        {"claim": ClaimOut.model_validate(claim).model_dump(mode="json")}
    )


@router.post(
    "/{claim_id}/decide",
    response_model=SuccessEnvelope[dict],
    summary="Approve or reject a claim request",
)
async def post_claim_decide(
    claim_id: UUID,
    body: ClaimDecisionRequest,
    current_user: User = Depends(require_moderator),
    db: AsyncSession = Depends(get_db),
):
    claim = await decide_claim(db, claim_id, body, current_user)
    return success(
        {"claim": ClaimOut.model_validate(claim).model_dump(mode="json")}
    )
