from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import raise_api_error
from app.core.responses import success
from app.models.enums import ReportStatus
from app.models.event import Event
from app.models.user import User
from app.repositories import event_repository
from app.services import event_service

router = APIRouter()


class EventCreateRequest(BaseModel):
    subject_account_id: UUID
    event_type: str
    description: str = Field(..., min_length=10, max_length=1000)
    base_impact_key: str = "default"
    proof_links: list[str] = Field(default_factory=list)
    location: str = "Global"
    is_anonymous: bool = False


def _serialize_event(event: Event) -> dict:
    return {
        "id": str(event.id),
        "subject_account_id": str(event.subject_account_id),
        "event_type": event.event_type,
        "description": event.description,
        "status": event.status.value,
        "delta": event.delta,
        "score_before": event.score_before,
        "score_after": event.score_after,
        "created_at": event.created_at.isoformat(),
        "proof_links": event.proof_links or [],
        "stats": event.stats or {},
    }


@router.get("/events")
async def get_events(
    account_id: UUID | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    if account_id is not None:
        events, _ = await event_repository.list_for_account(
            db, account_id, limit, None
        )
    else:
        events, _ = await event_repository.list_public_feed(db, limit, None)
    return success({"events": [_serialize_event(e) for e in events]})


@router.post("/events")
async def post_event(
    data: EventCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.event_type not in ("positive", "negative"):
        raise_api_error("validation_error", "event_type must be positive or negative")

    result = await event_service.create_event(
        db,
        subject_account_id=data.subject_account_id,
        event_type=data.event_type,
        description=data.description,
        reporter_user_id=None if data.is_anonymous else current_user.id,
        location=data.location,
        base_impact_key=data.base_impact_key,
        proof_links=data.proof_links,
        status=ReportStatus.PENDING,
    )
    return JSONResponse(
        status_code=201,
        content={"ok": True, "data": {"event": _serialize_event(result)}},
    )
