from __future__ import annotations

import hashlib
import hmac
from datetime import datetime, timezone
from urllib.parse import unquote, urlparse
from uuid import UUID

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import raise_api_error
from app.repositories import user_repository


def _owns_upload(url: str, user_id: UUID) -> bool:
    try:
        decoded = unquote(urlparse(url).path)
        return f"uploads/{user_id}/" in decoded
    except Exception:
        return False


def verify_signature(
    payment_id: str,
    subscription_id: str,
    signature: str,
) -> bool:
    message = f"{payment_id}|{subscription_id}"
    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


async def create_subscription(
    db: AsyncSession,
    user_id: UUID,
    currency: str,
) -> dict:
    user = await user_repository.get_by_id(db, user_id)
    if user is None:
        raise_api_error("not_found", "User not found")

    if user.trust_badge:
        raise_api_error("conflict", "Trust badge already active")

    currency_upper = currency.upper()
    if currency_upper not in ("USD", "INR"):
        raise_api_error("validation_error", "Invalid currency")

    if user.trust_badge_subscription_id and user.trust_badge_pending:
        return {
            "subscriptionId": user.trust_badge_subscription_id,
            "keyId": settings.RAZORPAY_KEY_ID,
            "currency": user.trust_badge_subscription_currency or currency_upper,
            "isSubscription": True,
        }

    plan_id = (
        settings.RAZORPAY_PLAN_ID_USD
        if currency_upper == "USD"
        else settings.RAZORPAY_PLAN_ID_INR
    )
    if not plan_id or not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise_api_error("service_unavailable", "Payment plan not configured")

    payload = {
        "plan_id": plan_id,
        "total_count": 12,
        "quantity": 1,
        "customer_notify": 1,
        "notes": {
            "userId": str(user_id),
            "purpose": "trust_badge",
            "currency": currency_upper,
        },
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            "https://api.razorpay.com/v1/subscriptions",
            json=payload,
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
        )

    if resp.status_code != 200:
        raise_api_error("service_unavailable", "Failed to create payment subscription")

    data = resp.json()
    subscription_id = data["id"]

    await user_repository.update(
        db,
        user,
        trust_badge_subscription_id=subscription_id,
        trust_badge_subscription_status="created",
        trust_badge_subscription_currency=currency_upper,
    )
    await db.commit()

    return {
        "subscriptionId": subscription_id,
        "keyId": settings.RAZORPAY_KEY_ID,
        "currency": currency_upper,
        "isSubscription": True,
    }


async def verify_and_submit(
    db: AsyncSession,
    user_id: UUID,
    razorpay_payment_id: str,
    razorpay_subscription_id: str,
    razorpay_signature: str,
    selfie_url: str,
    doc_url: str,
    doc_type: str,
) -> dict:
    user = await user_repository.get_by_id(db, user_id)
    if user is None:
        raise_api_error("not_found", "User not found")

    if user.trust_badge:
        raise_api_error("conflict", "Trust badge already active")

    if user.trust_badge_pending:
        return {"success": True, "pending": True}

    if user.trust_badge_subscription_id != razorpay_subscription_id:
        raise_api_error("forbidden", "Subscription ID mismatch")

    if not verify_signature(
        razorpay_payment_id, razorpay_subscription_id, razorpay_signature
    ):
        raise_api_error("forbidden", "Invalid payment signature")

    if not _owns_upload(selfie_url, user_id) or not _owns_upload(doc_url, user_id):
        raise_api_error("forbidden", "Media was not uploaded by this user")

    now = datetime.now(timezone.utc)

    await user_repository.update(
        db,
        user,
        trust_badge_pending=True,
        trust_badge_submitted_at=now,
        trust_badge_selfie_url=selfie_url,
        trust_badge_doc_url=doc_url,
        trust_badge_doc_type=doc_type,
        trust_badge_payment_id=razorpay_payment_id,
        trust_badge_subscription_status="authenticated",
    )
    await db.commit()

    return {"success": True, "pending": True}
