from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import raise_api_error
from app.models.enums import EvidenceProposalStatus
from app.models.evidence_proposal import EvidenceProposal
from app.repositories import evidence_proposal_repository as repo

_DECISION_STATUSES = (EvidenceProposalStatus.APPROVED, EvidenceProposalStatus.REJECTED)


async def create_evidence_proposal(
    db: AsyncSession,
    account_id: UUID,
    **kwargs,
) -> EvidenceProposal:
    proposal = await repo.create(db, account_id=account_id, **kwargs)
    await db.commit()
    await db.refresh(proposal)
    return proposal


async def list_pending(
    db: AsyncSession,
    limit: int,
    cursor: str | None,
) -> tuple[list[EvidenceProposal], str | None]:
    return await repo.list_pending(db, limit, cursor)


async def list_for_account(
    db: AsyncSession,
    account_id: UUID,
    limit: int,
    cursor: str | None,
) -> tuple[list[EvidenceProposal], str | None]:
    return await repo.list_for_account(db, account_id, limit, cursor)


async def decide_evidence_proposal(
    db: AsyncSession,
    proposal_id: UUID,
    reviewer_id: UUID,
    status: EvidenceProposalStatus,
    review_note: str | None = None,
) -> EvidenceProposal:
    if status not in _DECISION_STATUSES:
        raise_api_error("validation_error", "Decision must be APPROVED or REJECTED")

    proposal = await repo.get_by_id(db, proposal_id)
    if proposal is None:
        raise_api_error("not_found", "Evidence proposal not found")

    if proposal.status != EvidenceProposalStatus.PENDING:
        raise_api_error("conflict", "Evidence proposal has already been decided")

    updated = await repo.update(
        db,
        proposal,
        status=status,
        reviewed_by=reviewer_id,
        reviewed_at=datetime.now(timezone.utc),
    )
    await db.commit()
    await db.refresh(updated)
    return updated
