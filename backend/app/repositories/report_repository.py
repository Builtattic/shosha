from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.account import Account
from app.models.enums import ReportStatus, VoteType
from app.models.report import Report, ReportComment, ReportMedia, ReportVote
from app.repositories._pagination import (
    apply_created_at_cursor,
    build_next_cursor,
    decode_cursor,
)


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
        .options(selectinload(Report.media_items))
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
    result = await db.execute(stmt)
    return build_next_cursor(list(result.scalars().all()), limit)


async def list_feed(
    db: AsyncSession,
    limit: int = 20,
    cursor: str | None = None,
    platform: str | None = None,
) -> tuple[list[Report], str | None]:
    stmt = (
        select(Report)
        .where(Report.status == ReportStatus.APPROVED)
        .options(
            selectinload(Report.media_items),
            selectinload(Report.account),
        )
    )
    if platform is not None:
        stmt = stmt.join(Account).where(Account.platform == platform)
    stmt = apply_created_at_cursor(
        stmt, Report.created_at, decode_cursor(cursor), descending=True
    )
    stmt = stmt.order_by(Report.created_at.desc(), Report.id.desc()).limit(limit + 1)
    result = await db.execute(stmt)
    return build_next_cursor(list(result.scalars().all()), limit)


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
