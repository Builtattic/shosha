from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import raise_api_error
from app.models.user import User
from app.repositories import notification_repository, user_repository
from app.services import admin_action_service
from app.models.enums import AdminActionType, NotificationType
from app.services.credibility_service import calc_credibility


async def list_pending(db: AsyncSession) -> list[User]:
    from sqlalchemy import select

    result = await db.execute(
        select(User)
        .where(User.trust_badge_pending.is_(True))
        .order_by(User.trust_badge_submitted_at.asc().nulls_last())
    )
    return list(result.scalars().all())


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
        await db.refresh(user)

        cred = calc_credibility(user)
        await user_repository.update(db, user, credibility=cred.total)
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
