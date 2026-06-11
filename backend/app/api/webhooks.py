from __future__ import annotations

import hashlib
import hmac
import json
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import async_session_maker
from app.repositories import user_repository

router = APIRouter()


async def _handle_event(db: AsyncSession, event: str, payload: dict) -> None:
    subscription = (
        payload.get("payload", {}).get("subscription", {}).get("entity", {})
    )
    notes = subscription.get("notes", {})
    user_id_str = notes.get("userId")
    subscription_id = subscription.get("id")

    if not user_id_str or not subscription_id:
        return

    try:
        user_id = UUID(user_id_str)
    except (ValueError, TypeError):
        return

    user = await user_repository.get_by_id(db, user_id)
    if user is None:
        return

    if user.trust_badge_subscription_id != subscription_id:
        return

    if event == "subscription.charged":
        await user_repository.update(
            db,
            user,
            trust_badge_subscription_status="active",
        )
        await db.commit()
    elif event in ("subscription.cancelled", "subscription.completed"):
        status = event.split(".")[1]
        await user_repository.update(
            db,
            user,
            trust_badge=False,
            trust_badge_pending=False,
            trust_badge_subscription_status=status,
        )
        await db.commit()
    elif event == "subscription.halted":
        await user_repository.update(
            db,
            user,
            trust_badge_subscription_status="halted",
        )
        await db.commit()


@router.post("/webhooks/razorpay")
async def razorpay_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("x-razorpay-signature", "")

    if not settings.RAZORPAY_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Webhook not configured")

    expected = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON") from None

    event = payload.get("event", "")

    async with async_session_maker() as db:
        await _handle_event(db, event, payload)

    return {"received": True}
