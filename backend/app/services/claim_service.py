from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import raise_api_error
from app.models.claim_request import ClaimRequest
from app.models.enums import ClaimRequestStatus, NotificationType
from app.models.user import User
from app.repositories import (
    create_claim,
    create_notification,
    get_account_by_id,
    get_any_claim_by_account_and_user,
    get_claim_by_account_and_user,
    get_claim_by_id,
    list_claims_for_user,
    list_pending_claims,
    update_account,
    update_claim_status,
)
from app.schemas.claim import ClaimCreateRequest, ClaimDecisionRequest
from app.services._helpers import is_moderator_plus


async def submit_claim(
    db: AsyncSession,
    data: ClaimCreateRequest,
    current_user: User,
) -> ClaimRequest:
    account = await get_account_by_id(db, data.account_id)
    if account is None:
        raise_api_error("not_found", "Account not found")

    if account.owner_user_id is not None:
        raise_api_error("conflict", "This account has already been claimed")

    existing = await get_claim_by_account_and_user(
        db, data.account_id, current_user.id
    )
    if existing is not None and existing.status == ClaimRequestStatus.PENDING:
        raise_api_error("conflict", "You already have a pending claim on this account")

    prior = await get_any_claim_by_account_and_user(
        db, data.account_id, current_user.id
    )
    if prior is not None:
        raise_api_error("conflict", "You already submitted a claim on this account")

    claim = await create_claim(
        db,
        data.account_id,
        current_user.id,
        data.evidence_type,
        data.evidence_payload,
    )
    await db.commit()
    await db.refresh(claim)
    return claim


async def get_my_claims(
    db: AsyncSession,
    current_user: User,
    limit: int,
    cursor: str | None,
) -> tuple[list[ClaimRequest], str | None]:
    return await list_claims_for_user(db, current_user.id, limit, cursor)


async def get_claim(
    db: AsyncSession,
    claim_id: UUID,
    current_user: User,
) -> ClaimRequest:
    claim = await get_claim_by_id(db, claim_id)
    if claim is None:
        raise_api_error("not_found", "Claim not found")

    is_requester = claim.requester_user_id == current_user.id
    if not is_requester and not is_moderator_plus(current_user):
        raise_api_error("forbidden", "Not authorized to view this claim")

    return claim


async def get_pending_claims(
    db: AsyncSession,
    current_user: User,
    limit: int,
    cursor: str | None,
) -> tuple[list[ClaimRequest], str | None]:
    if not is_moderator_plus(current_user):
        raise_api_error("forbidden", "Moderator access required")
    return await list_pending_claims(db, limit, cursor)


async def decide_claim(
    db: AsyncSession,
    claim_id: UUID,
    data: ClaimDecisionRequest,
    current_user: User,
) -> ClaimRequest:
    if not is_moderator_plus(current_user):
        raise_api_error("forbidden", "Moderator access required")

    claim = await get_claim_by_id(db, claim_id)
    if claim is None:
        raise_api_error("not_found", "Claim not found")

    if claim.status != ClaimRequestStatus.PENDING:
        raise_api_error("conflict", "Claim has already been decided")

    now = datetime.now(timezone.utc)

    if data.decision == ClaimRequestStatus.APPROVED:
        account = await get_account_by_id(db, claim.account_id)
        if account is None:
            raise_api_error("not_found", "Account not found")
        if account.owner_user_id is not None:
            raise_api_error("conflict", "This account has already been claimed")
        await update_account(db, account, owner_user_id=claim.requester_user_id)

    await update_claim_status(
        db,
        claim,
        data.decision,
        current_user.id,
        now,
    )
    await db.commit()

    loaded = await get_claim_by_id(db, claim.id)
    assert loaded is not None

    if data.decision == ClaimRequestStatus.APPROVED:
        title = "Claim approved"
        message = "Your claim on this account was approved."
    else:
        title = "Claim rejected"
        message = "Your claim on this account was not approved."
    await create_notification(
        db,
        loaded.requester_user_id,
        NotificationType.CLAIM,
        title,
        message,
        metadata_json={
            "claim_id": str(claim_id),
            "account_id": str(loaded.account_id),
        },
    )
    await db.commit()

    return loaded
