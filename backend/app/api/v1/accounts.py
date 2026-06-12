from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_user_optional
from app.core.responses import success
from app.models.enums import AccountStatus
from app.models.user import User
from app.repositories import ledger_repository
from app.schemas.account import (
    AccountCreateRequest,
    AccountData,
    AccountDetailData,
    AccountDetailOut,
    AccountOut,
    AccountUpdateRequest,
    SocialLinkCreateRequest,
    SocialLinkData,
    SocialLinkOut,
    SocialLinksData,
)
from app.schemas.common import PaginatedResponse, SuccessEnvelope
from app.services import (
    add_social_link,
    create_account,
    get_account,
    get_social_links,
    list_accounts,
    search_accounts,
    update_account,
)
from app.services.scoring_service import calc_window_scores_from_entries


def _score_history(entries: list) -> list[dict]:
    return [
        {"t": e.timestamp.isoformat(), "s": e.delta, "cause": e.cause}
        for e in entries
    ]

router = APIRouter()


def _serialize_accounts(items: list) -> list[dict]:
    serialized: list[dict] = []
    for account in items:
        payload = AccountOut.model_validate(account).model_dump(mode="json")
        payload["weekly_delta"] = account.w1_delta
        serialized.append(payload)
    return serialized


@router.post(
    "/",
    response_model=SuccessEnvelope[AccountData],
    summary="Create account",
)
async def post_account(
    body: AccountCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    account = await create_account(db, body, current_user)
    return success(
        {"account": AccountOut.model_validate(account).model_dump(mode="json")}
    )


@router.get(
    "/",
    response_model=SuccessEnvelope[PaginatedResponse[AccountOut]],
    summary="List accounts",
)
async def get_accounts(
    platform: str | None = Query(default=None),
    status: AccountStatus | None = Query(default=None),
    owner_user_id: UUID | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = Query(default=None),
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    items, next_cursor = await list_accounts(
        db, platform, status, limit, cursor, current_user, owner_user_id
    )
    return success({"items": _serialize_accounts(items), "next_cursor": next_cursor})


@router.get(
    "/search",
    response_model=SuccessEnvelope[PaginatedResponse[AccountOut]],
    summary="Search accounts",
)
async def get_accounts_search(
    q: str = Query(...),
    platform: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    items, next_cursor = await search_accounts(db, q, platform, limit, cursor)
    return success({"items": _serialize_accounts(items), "next_cursor": next_cursor})


@router.get(
    "/{account_id}/score-history",
    summary="Get account score history",
)
async def get_account_score_history(
    account_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    await get_account(db, account_id, current_user)
    entries = await ledger_repository.list_for_account(db, account_id)
    return success({"history": _score_history(entries)})


@router.get(
    "/{account_id}/score-windows",
    summary="Get account window scores",
)
async def get_account_score_windows(
    account_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    await get_account(db, account_id, current_user)
    entries = await ledger_repository.list_for_account(db, account_id)
    return success({"window_scores": calc_window_scores_from_entries(entries)})


@router.get(
    "/{account_id}",
    response_model=SuccessEnvelope[AccountDetailData],
    summary="Get account by ID",
)
async def get_account_by_id(
    account_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    account = await get_account(db, account_id, current_user)
    entries = await ledger_repository.list_for_account(db, account_id)
    payload = AccountDetailOut.model_validate(account)
    payload.score_history = _score_history(entries)
    payload.window_scores = calc_window_scores_from_entries(entries)
    return success({"account": payload.model_dump(mode="json")})


@router.patch(
    "/{account_id}",
    response_model=SuccessEnvelope[AccountData],
    summary="Update account",
)
async def patch_account_by_id(
    account_id: UUID,
    body: AccountUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    account = await update_account(db, account_id, body, current_user)
    return success(
        {"account": AccountOut.model_validate(account).model_dump(mode="json")}
    )


@router.get(
    "/{account_id}/social-links",
    response_model=SuccessEnvelope[SocialLinksData],
    summary="List account social links",
)
async def get_account_social_links(
    account_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    links = await get_social_links(db, account_id)
    return success(
        {
            "links": [
                SocialLinkOut.model_validate(link).model_dump(mode="json")
                for link in links
            ]
        }
    )


@router.post(
    "/{account_id}/social-links",
    response_model=SuccessEnvelope[SocialLinkData],
    summary="Add or update account social link",
)
async def post_account_social_link(
    account_id: UUID,
    body: SocialLinkCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    link = await add_social_link(db, account_id, body, current_user)
    return success(
        {"link": SocialLinkOut.model_validate(link).model_dump(mode="json")}
    )
