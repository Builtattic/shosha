from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import raise_api_error
from app.models.account import Account
from app.models.enums import AdminActionType, NotificationType
from app.models.user import User
from app.repositories import account_repository, notification_repository, user_repository
from app.services import admin_action_service


async def list_pending(db: AsyncSession) -> list[User]:
    result = await db.execute(
        select(User)
        .where(User.trust_badge_pending.is_(True))
        .order_by(User.trust_badge_submitted_at.asc().nulls_last())
    )
    return list(result.scalars().all())


async def _get_website_account(db: AsyncSession, user_id: UUID) -> Account | None:
    result = await db.execute(
        select(Account)
        .where(
            Account.owner_user_id == user_id,
            Account.platform == "website",
        )
        .limit(1)
    )
    return result.scalar_one_or_none()


async def decide(
    db: AsyncSession,
    user_id: UUID,
    actor_id: UUID,
    verdict: str,
    note: str | None = None,
) -> dict:
    if verdict not in ("approved", "rejected"):
        raise_api_error("validation_error", "verdict must be approved or rejected")

    user = await user_repository.get_by_id(db, user_id)
    if user is None:
        raise_api_error("not_found", "User not found")
    if user.trust_badge_pending is not True:
        raise_api_error("conflict", "No pending trust badge request for this user")

    now = datetime.now(timezone.utc)

    if verdict == "approved":
        await user_repository.update(
            db,
            user,
            trust_badge=True,
            trust_badge_at=now,
            trust_badge_pending=False,
            trust_badge_rejected_at=None,
            trust_badge_rejection_reason=None,
        )
        await db.commit()

        website_account = await _get_website_account(db, user_id)
        if website_account:
            # KNOWN GAP (V1 parity): V1 sets website account trustBadge=true and credibility=100.
            # V2 Account has no trust_badge or credibility columns; score=1000.0 is a temporary proxy.
            # Revisit when Account gains credibility/trust_badge fields or a dedicated scoring hook.
            await account_repository.update(db, website_account, score=1000.0)
            await db.commit()

        await notification_repository.create(
            db,
            user_id=user_id,
            notification_type=NotificationType.TRUST_BADGE,
            title="Trust Badge Approved",
            message="Your trust badge application has been approved.",
            metadata_json={"verdict": "approved"},
        )
        await db.commit()
    else:
        await user_repository.update(
            db,
            user,
            trust_badge_pending=False,
            trust_badge_rejected_at=now,
            trust_badge_rejection_reason=(
                note or "Your application did not meet our requirements."
            ),
        )
        await db.commit()

        await notification_repository.create(
            db,
            user_id=user_id,
            notification_type=NotificationType.TRUST_BADGE,
            title="Trust Badge Rejected",
            message=note or "Your trust badge application was not approved.",
            metadata_json={"verdict": "rejected"},
        )
        await db.commit()

    await admin_action_service.log_action(
        db,
        actor_user_id=actor_id,
        action_type=AdminActionType.TRUST_BADGE_DECIDE,
        target_type="user",
        target_id=user_id,
        metadata_json={"verdict": verdict, "note": note},
    )

    return {"verdict": verdict}
