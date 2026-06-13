from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased, selectinload

from app.models.account import Account
from app.models.enums import ReportStatus, VoteType
from app.models.report import Report, ReportComment, ReportMedia, ReportVote
from app.models.user import User
from app.models.user_follow import UserFollow
from app.repositories._pagination import (
    apply_created_at_cursor,
    build_next_cursor,
    decode_cursor,
)

FeedFilter = Literal["all", "following", "near", "top"]

_REPORT_OUT_LOAD_OPTIONS = (
    selectinload(Report.media_items),
    selectinload(Report.account),
)


def _approved_feed_stmt(*, platform: str | None):
    stmt = (
        select(Report)
        .where(Report.status == ReportStatus.APPROVED)
        .options(*_REPORT_OUT_LOAD_OPTIONS)
    )
    if platform is not None:
        stmt = stmt.join(Account).where(Account.platform == platform)
    return stmt


async def fetch_feed_aggregates(
    db: AsyncSession,
    report_ids: list[UUID],
    viewer_user_id: UUID | None,
) -> dict[UUID, dict]:
    if not report_ids:
        return {}

    vote_result = await db.execute(
        select(
            ReportVote.report_id,
            func.count()
            .filter(ReportVote.vote_type == VoteType.ALIGN)
            .label("align_count"),
            func.count()
            .filter(ReportVote.vote_type == VoteType.OPPOSE)
            .label("oppose_count"),
        )
        .where(ReportVote.report_id.in_(report_ids))
        .group_by(ReportVote.report_id)
    )
    comment_result = await db.execute(
        select(
            ReportComment.report_id,
            func.count().label("comment_count"),
        )
        .where(ReportComment.report_id.in_(report_ids))
        .group_by(ReportComment.report_id)
    )

    aggregates: dict[UUID, dict] = {
        report_id: {
            "align_count": 0,
            "oppose_count": 0,
            "comment_count": 0,
            "viewer_vote": None,
        }
        for report_id in report_ids
    }

    for row in vote_result.all():
        aggregates[row.report_id]["align_count"] = int(row.align_count)
        aggregates[row.report_id]["oppose_count"] = int(row.oppose_count)

    for row in comment_result.all():
        aggregates[row.report_id]["comment_count"] = int(row.comment_count)

    if viewer_user_id is not None:
        viewer_result = await db.execute(
            select(ReportVote.report_id, ReportVote.vote_type).where(
                ReportVote.report_id.in_(report_ids),
                ReportVote.user_id == viewer_user_id,
            )
        )
        for report_id, vote_type in viewer_result.all():
            aggregates[report_id]["viewer_vote"] = vote_type

    return aggregates


async def _attach_vote_comment_counts(db: AsyncSession, report: Report) -> None:
    align_result = await db.execute(
        select(func.count())
        .select_from(ReportVote)
        .where(
            ReportVote.report_id == report.id,
            ReportVote.vote_type == VoteType.ALIGN,
        )
    )
    oppose_result = await db.execute(
        select(func.count())
        .select_from(ReportVote)
        .where(
            ReportVote.report_id == report.id,
            ReportVote.vote_type == VoteType.OPPOSE,
        )
    )
    comment_result = await db.execute(
        select(func.count())
        .select_from(ReportComment)
        .where(ReportComment.report_id == report.id)
    )
    report.align_count = align_result.scalar_one()
    report.oppose_count = oppose_result.scalar_one()
    report.comment_count = comment_result.scalar_one()


async def get_by_id(db: AsyncSession, report_id: UUID) -> Report | None:
    result = await db.execute(
        select(Report)
        .where(Report.id == report_id)
        .options(*_REPORT_OUT_LOAD_OPTIONS)
    )
    report = result.scalar_one_or_none()
    if report is None:
        return None
    await _attach_vote_comment_counts(db, report)
    return report


async def list_reports(
    db: AsyncSession,
    account_id: UUID | None,
    status: ReportStatus | None,
    limit: int,
    cursor: str | None,
) -> tuple[list[Report], str | None]:
    stmt = select(Report)
    if account_id is not None:
        stmt = stmt.where(Report.account_id == account_id)
    if status is not None:
        stmt = stmt.where(Report.status == status)
    stmt = apply_created_at_cursor(
        stmt, Report.created_at, decode_cursor(cursor), descending=True
    )
    stmt = stmt.order_by(Report.created_at.desc(), Report.id.desc()).limit(limit + 1)
    stmt = stmt.options(*_REPORT_OUT_LOAD_OPTIONS)
    result = await db.execute(stmt)
    return build_next_cursor(list(result.scalars().all()), limit)


async def list_feed(
    db: AsyncSession,
    limit: int = 20,
    cursor: str | None = None,
    platform: str | None = None,
    feed_filter: FeedFilter = "all",
    viewer_user_id: UUID | None = None,
    viewer_city: str | None = None,
) -> tuple[list[Report], str | None, str | None]:
    empty_reason: str | None = None

    if feed_filter == "near":
        normalized_city = (viewer_city or "").strip()
        if not normalized_city:
            return [], None, "insufficient_location_data"

    stmt = _approved_feed_stmt(platform=platform)

    if feed_filter == "following":
        following_subq = select(UserFollow.following_id).where(
            UserFollow.follower_id == viewer_user_id
        )
        stmt = stmt.where(Report.reporter_user_id.in_(following_subq))
    elif feed_filter == "near":
        reporter = aliased(User)
        stmt = stmt.join(reporter, Report.reporter_user_id == reporter.id).where(
            func.lower(func.trim(reporter.city)) == func.lower(normalized_city)
        )
    elif feed_filter == "top":
        stmt = apply_created_at_cursor(
            stmt, Report.created_at, decode_cursor(cursor), descending=True
        )
        stmt = stmt.order_by(
            func.abs(Report.base_score).desc().nulls_last(),
            Report.created_at.desc(),
            Report.id.desc(),
        ).limit(limit + 1)
        result = await db.execute(stmt)
        return (*build_next_cursor(list(result.scalars().all()), limit), empty_reason)

    stmt = apply_created_at_cursor(
        stmt, Report.created_at, decode_cursor(cursor), descending=True
    )
    stmt = stmt.order_by(Report.created_at.desc(), Report.id.desc()).limit(limit + 1)
    result = await db.execute(stmt)
    items, next_cursor = build_next_cursor(list(result.scalars().all()), limit)
    return items, next_cursor, empty_reason


async def list_moderation_queue(
    db: AsyncSession,
    status: ReportStatus | None,
    platform: str | None,
    sort: str,
    limit: int,
    cursor: str | None,
) -> tuple[list[Report], str | None]:
    descending = sort != "oldest"
    stmt = select(Report)
    if platform is not None:
        stmt = stmt.join(Account).where(Account.platform == platform)
    if status is not None:
        stmt = stmt.where(Report.status == status)
    stmt = apply_created_at_cursor(
        stmt, Report.created_at, decode_cursor(cursor), descending=descending
    )
    if descending:
        stmt = stmt.order_by(Report.created_at.desc(), Report.id.desc())
    else:
        stmt = stmt.order_by(Report.created_at.asc(), Report.id.asc())
    stmt = stmt.limit(limit + 1)
    stmt = stmt.options(*_REPORT_OUT_LOAD_OPTIONS)
    result = await db.execute(stmt)
    return build_next_cursor(list(result.scalars().all()), limit)


async def create(
    db: AsyncSession,
    account_id: UUID,
    reporter_user_id: UUID | None,
    title: str,
    description: str,
    *,
    report_type: str | None = None,
    is_irl: bool = False,
    evidence_source_url: str | None = None,
) -> Report:
    report = Report(
        account_id=account_id,
        reporter_user_id=reporter_user_id,
        title=title,
        description=description,
        report_type=report_type,
        is_irl=is_irl,
        evidence_source_url=evidence_source_url,
    )
    db.add(report)
    await db.flush()
    await db.refresh(report)
    return report


async def add_media(
    db: AsyncSession,
    report_id: UUID,
    media_type: str,
    url: str,
    thumbnail_url: str | None,
) -> ReportMedia:
    media = ReportMedia(
        report_id=report_id,
        media_type=media_type,
        url=url,
        thumbnail_url=thumbnail_url,
    )
    db.add(media)
    await db.flush()
    await db.refresh(media)
    return media


async def _vote_counts(db: AsyncSession, report_id: UUID) -> tuple[int, int]:
    align_result = await db.execute(
        select(func.count())
        .select_from(ReportVote)
        .where(ReportVote.report_id == report_id, ReportVote.vote_type == VoteType.ALIGN)
    )
    oppose_result = await db.execute(
        select(func.count())
        .select_from(ReportVote)
        .where(ReportVote.report_id == report_id, ReportVote.vote_type == VoteType.OPPOSE)
    )
    return align_result.scalar_one(), oppose_result.scalar_one()


async def upsert_vote(
    db: AsyncSession,
    report_id: UUID,
    user_id: UUID,
    vote_type: VoteType,
) -> tuple[ReportVote, int, int]:
    stmt = (
        insert(ReportVote)
        .values(report_id=report_id, user_id=user_id, vote_type=vote_type)
        .on_conflict_do_update(
            constraint="uq_report_votes_report_user",
            set_={"vote_type": vote_type},
        )
        .returning(ReportVote)
    )
    result = await db.execute(stmt)
    vote = result.scalar_one()
    await db.flush()
    await db.refresh(vote)
    align_count, oppose_count = await _vote_counts(db, report_id)
    return vote, align_count, oppose_count


async def add_comment(
    db: AsyncSession,
    report_id: UUID,
    user_id: UUID,
    body: str,
) -> ReportComment:
    comment = ReportComment(report_id=report_id, user_id=user_id, body=body)
    db.add(comment)
    await db.flush()
    await db.refresh(comment)
    return comment


async def list_comments(
    db: AsyncSession,
    report_id: UUID,
    limit: int,
    cursor: str | None,
) -> tuple[list[ReportComment], str | None]:
    stmt = select(ReportComment).where(ReportComment.report_id == report_id)
    stmt = apply_created_at_cursor(
        stmt, ReportComment.created_at, decode_cursor(cursor), descending=True
    )
    stmt = stmt.order_by(
        ReportComment.created_at.desc(), ReportComment.id.desc()
    ).limit(limit + 1)
    result = await db.execute(stmt)
    return build_next_cursor(list(result.scalars().all()), limit)


async def update_status(
    db: AsyncSession,
    report: Report,
    status: ReportStatus,
    reviewed_by: UUID | None,
    reviewed_at: datetime | None,
) -> Report:
    report.status = status
    report.reviewed_by = reviewed_by
    report.reviewed_at = reviewed_at
    await db.flush()
    await db.refresh(report)
    return report


async def update(db: AsyncSession, report: Report, **kwargs) -> Report:
    for key, value in kwargs.items():
        setattr(report, key, value)
    await db.flush()
    await db.refresh(report)
    return report


async def count_by_status(db: AsyncSession) -> dict[str, int]:
    counts = {s.value: 0 for s in ReportStatus}
    result = await db.execute(
        select(Report.status, func.count()).group_by(Report.status)
    )
    for status, count in result.all():
        counts[status.value] = count
    return counts


async def search_reports(
    db: AsyncSession,
    query: str,
    limit: int = 30,
) -> list[Report]:
    pattern = f"%{query.strip()}%"
    result = await db.execute(
        select(Report)
        .where(
            Report.status == ReportStatus.APPROVED,
            (
                Report.description.ilike(pattern)
                | Report.deed.ilike(pattern)
                | Report.title.ilike(pattern)
            ),
        )
        .options(*_REPORT_OUT_LOAD_OPTIONS)
        .order_by(Report.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def list_by_reporter(
    db: AsyncSession,
    reporter_user_id: UUID,
    limit: int = 50,
) -> list[Report]:
    result = await db.execute(
        select(Report)
        .where(Report.reporter_user_id == reporter_user_id)
        .options(*_REPORT_OUT_LOAD_OPTIONS)
        .order_by(Report.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def count_reports(db: AsyncSession) -> int:
    result = await db.execute(select(func.count()).select_from(Report))
    return result.scalar_one()


async def count_reports_since(db: AsyncSession, since: datetime) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(Report)
        .where(Report.created_at >= since)
    )
    return result.scalar_one()


async def count_approved(db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(Report)
        .where(Report.status == ReportStatus.APPROVED)
    )
    return result.scalar_one()
