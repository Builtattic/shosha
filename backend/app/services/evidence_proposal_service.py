from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import raise_api_error
from app.models.enums import (
    AdminActionType,
    EvidenceProposalStatus,
    ReportStatus,
)
from app.models.evidence_proposal import EvidenceProposal
from app.repositories import (
    account_repository,
    evidence_proposal_repository as repo,
    report_repository,
)
from app.services import admin_action_service
from app.services.scoring_service import DEFAULT_MULTIPLIERS, apply_report_score

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
) -> EvidenceProposal | dict:
    if status not in _DECISION_STATUSES:
        raise_api_error("validation_error", "Decision must be APPROVED or REJECTED")

    proposal = await repo.get_by_id(db, proposal_id)
    if proposal is None:
        raise_api_error("not_found", "Evidence proposal not found")

    if proposal.status != EvidenceProposalStatus.PENDING:
        raise_api_error("already_decided", "Evidence proposal has already been decided")

    if status == EvidenceProposalStatus.REJECTED:
        updated = await repo.update(
            db,
            proposal,
            status=EvidenceProposalStatus.REJECTED,
            reviewed_by=reviewer_id,
            reviewed_at=datetime.now(timezone.utc),
        )
        await db.commit()
        await db.refresh(updated)
        await admin_action_service.log_action(
            db,
            actor_user_id=reviewer_id,
            action_type=AdminActionType.EVIDENCE_DECIDE,
            target_type="evidence_proposal",
            target_id=updated.id,
            reason=review_note,
            metadata_json={"verdict": "rejected", "note": review_note},
        )
        return updated

    account = await account_repository.get_by_id(db, proposal.account_id)
    if account is None:
        raise_api_error("not_found", "Account not found for this evidence proposal")

    report = await report_repository.create(
        db,
        account_id=proposal.account_id,
        reporter_user_id=proposal.reporter_user_id,
        title=proposal.title,
        description=proposal.summary,
        report_type=proposal.report_type,
    )
    report.status = ReportStatus.APPROVED
    report.deed = proposal.scoring_deed
    report.base_score = proposal.base_score if proposal.base_score is not None else 0.0
    report.ai_verdict = {
        "valid": True,
        "reasoning": "Admin evidence approval",
        "categoryTags": [proposal.scoring_deed or ""],
        "proposedImpact": (proposal.suggested_impact or 0) / 10,
    }
    report.reviewed_at = datetime.now(timezone.utc)
    report.reviewed_by = reviewer_id
    await db.flush()

    await apply_report_score(db, report, account, dict(DEFAULT_MULTIPLIERS))

    updated = await repo.update(
        db,
        proposal,
        status=EvidenceProposalStatus.APPROVED,
        reviewed_by=reviewer_id,
        reviewed_at=datetime.now(timezone.utc),
        report_id=report.id,
    )
    await db.commit()
    await db.refresh(updated)

    await admin_action_service.log_action(
        db,
        actor_user_id=reviewer_id,
        action_type=AdminActionType.EVIDENCE_DECIDE,
        target_type="evidence_proposal",
        target_id=updated.id,
        reason=review_note,
        metadata_json={
            "verdict": "approved",
            "report_id": str(report.id),
            "account_id": str(account.id),
        },
    )

    return {"proposal": updated, "report": report, "account": account}
