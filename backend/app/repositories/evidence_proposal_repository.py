from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import EvidenceProposalStatus
from app.models.evidence_proposal import EvidenceProposal
from app.repositories._pagination import (
    apply_created_at_cursor,
    build_next_cursor,
    decode_cursor,
)


async def create(db: AsyncSession, **kwargs) -> EvidenceProposal:
    proposal = EvidenceProposal(**kwargs)
    db.add(proposal)
    await db.flush()
    await db.refresh(proposal)
    return proposal


async def get_by_id(db: AsyncSession, proposal_id: UUID) -> EvidenceProposal | None:
    result = await db.execute(
        select(EvidenceProposal).where(EvidenceProposal.id == proposal_id)
    )
    return result.scalar_one_or_none()


async def update(db: AsyncSession, obj: EvidenceProposal, **kwargs) -> EvidenceProposal:
    for key, value in kwargs.items():
        setattr(obj, key, value)
    await db.flush()
    await db.refresh(obj)
    return obj


async def list_pending(
    db: AsyncSession,
    limit: int = 50,
    cursor: str | None = None,
) -> tuple[list[EvidenceProposal], str | None]:
    stmt = select(EvidenceProposal).where(
        EvidenceProposal.status == EvidenceProposalStatus.PENDING
    )
    stmt = apply_created_at_cursor(
        stmt, EvidenceProposal.created_at, decode_cursor(cursor), descending=True
    )
    stmt = stmt.order_by(
        EvidenceProposal.created_at.desc(),
        EvidenceProposal.id.desc(),
    ).limit(limit + 1)
    result = await db.execute(stmt)
    return build_next_cursor(list(result.scalars().all()), limit)


async def list_for_account(
    db: AsyncSession,
    account_id: UUID,
    limit: int = 50,
    cursor: str | None = None,
) -> tuple[list[EvidenceProposal], str | None]:
    stmt = select(EvidenceProposal).where(EvidenceProposal.account_id == account_id)
    stmt = apply_created_at_cursor(
        stmt, EvidenceProposal.created_at, decode_cursor(cursor), descending=True
    )
    stmt = stmt.order_by(
        EvidenceProposal.created_at.desc(),
        EvidenceProposal.id.desc(),
    ).limit(limit + 1)
    result = await db.execute(stmt)
    return build_next_cursor(list(result.scalars().all()), limit)
