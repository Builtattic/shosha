from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import (
    get_current_user,
    get_current_user_optional,
    require_moderator,
)
from app.core.ratelimit import check_rate_limit, get_report_limiter
from app.core.responses import success
from app.models.enums import ReportStatus
from app.models.user import User
from app.schemas.common import PaginatedResponse, SuccessEnvelope
from app.schemas.report import (
    CommentCreateRequest,
    CommentData,
    CommentOut,
    ModerationDecisionRequest,
    ModerationRequestData,
    ModerationRequestRequest,
    ReportCreateRequest,
    ReportData,
    ReportOut,
    VoteOut,
    VoteRequest,
    VoteResponse,
)
from app.services import (
    add_comment,
    create_report,
    get_moderation_queue,
    get_report,
    list_comments,
    list_reports,
    moderate_report,
    request_moderation,
    vote_on_report,
)

router = APIRouter()


def _serialize_reports(items: list) -> list[dict]:
    return [ReportOut.model_validate(r).model_dump(mode="json") for r in items]


@router.get(
    "/moderation-queue",
    response_model=SuccessEnvelope[PaginatedResponse[ReportOut]],
    summary="Get moderation queue",
)
async def get_reports_moderation_queue(
    status: ReportStatus | None = Query(default=None),
    platform: str | None = Query(default=None),
    sort: str = Query(default="newest"),
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = Query(default=None),
    current_user: User = Depends(require_moderator),
    db: AsyncSession = Depends(get_db),
):
    items, next_cursor = await get_moderation_queue(
        db, status, platform, sort, limit, cursor
    )
    return success({"items": _serialize_reports(items), "next_cursor": next_cursor})


@router.post(
    "/",
    response_model=SuccessEnvelope[ReportData],
    summary="Create report",
)
async def post_report(
    body: ReportCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await check_rate_limit(f"report:{current_user.id}", get_report_limiter())
    report = await create_report(db, body, current_user)
    return success(
        {"report": ReportOut.model_validate(report).model_dump(mode="json")}
    )


@router.get(
    "/",
    response_model=SuccessEnvelope[PaginatedResponse[ReportOut]],
    summary="List reports",
)
async def get_reports(
    account_id: UUID | None = Query(default=None),
    status: ReportStatus | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = Query(default=None),
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    items, next_cursor = await list_reports(
        db, account_id, status, limit, cursor, current_user
    )
    return success({"items": _serialize_reports(items), "next_cursor": next_cursor})


@router.get(
    "/{report_id}",
    response_model=SuccessEnvelope[ReportData],
    summary="Get report by ID",
)
async def get_report_by_id(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    report = await get_report(db, report_id, current_user)
    return success(
        {"report": ReportOut.model_validate(report).model_dump(mode="json")}
    )


@router.post(
    "/{report_id}/votes",
    response_model=SuccessEnvelope[VoteResponse],
    summary="Vote on report",
)
async def post_report_vote(
    report_id: UUID,
    body: VoteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    vote, align_count, oppose_count = await vote_on_report(
        db, report_id, body, current_user
    )
    return success(
        {
            "vote": VoteOut.model_validate(vote).model_dump(mode="json"),
            "aggregates": {
                "align_count": align_count,
                "oppose_count": oppose_count,
            },
        }
    )


@router.post(
    "/{report_id}/comments",
    response_model=SuccessEnvelope[CommentData],
    summary="Add report comment",
)
async def post_report_comment(
    report_id: UUID,
    body: CommentCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    comment = await add_comment(db, report_id, body, current_user)
    return success(
        {"comment": CommentOut.model_validate(comment).model_dump(mode="json")}
    )


@router.get(
    "/{report_id}/comments",
    response_model=SuccessEnvelope[PaginatedResponse[CommentOut]],
    summary="List report comments",
)
async def get_report_comments(
    report_id: UUID,
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    items, next_cursor = await list_comments(db, report_id, limit, cursor)
    return success(
        {
            "items": [
                CommentOut.model_validate(c).model_dump(mode="json") for c in items
            ],
            "next_cursor": next_cursor,
        }
    )


@router.post(
    "/{report_id}/moderation-request",
    response_model=SuccessEnvelope[ModerationRequestData],
    summary="Request report moderation",
)
async def post_report_moderation_request(
    report_id: UUID,
    body: ModerationRequestRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await request_moderation(db, report_id, body, current_user)
    return success(result)


@router.post(
    "/{report_id}/moderate",
    response_model=SuccessEnvelope[ReportData],
    summary="Moderate report",
)
async def post_report_moderate(
    report_id: UUID,
    body: ModerationDecisionRequest,
    current_user: User = Depends(require_moderator),
    db: AsyncSession = Depends(get_db),
):
    report = await moderate_report(db, report_id, body, current_user)
    return success(
        {"report": ReportOut.model_validate(report).model_dump(mode="json")}
    )
