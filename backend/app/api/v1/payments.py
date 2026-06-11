from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.responses import success
from app.models.user import User
from app.services import payment_service

router = APIRouter()


class CreateOrderRequest(BaseModel):
    currency: str = Field(default="INR", pattern="^(USD|INR)$")


class VerifyPaymentRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_subscription_id: str
    razorpay_signature: str
    selfie_url: str
    doc_url: str
    doc_type: str = Field(pattern="^(passport|license|national)$")


@router.post("/me/upgrade/order")
async def create_upgrade_order(
    data: CreateOrderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await payment_service.create_subscription(
        db, current_user.id, data.currency
    )
    return success(result)


@router.post("/me/upgrade/verify")
async def verify_upgrade_payment(
    data: VerifyPaymentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await payment_service.verify_and_submit(
        db,
        current_user.id,
        data.razorpay_payment_id,
        data.razorpay_subscription_id,
        data.razorpay_signature,
        data.selfie_url,
        data.doc_url,
        data.doc_type,
    )
    return success(result)
