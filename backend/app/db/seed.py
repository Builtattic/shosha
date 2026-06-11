"""
Dev-only database seed script.
Usage: uv run python -m app.db.seed
Gated to ENVIRONMENT != 'production'.
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from itertools import cycle
from uuid import UUID

from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import async_session_maker
from app.models.account import Account, AccountSocialLink
from app.models.bubble import Bubble, BubbleJoinRequest, BubbleMember
from app.models.claim_request import ClaimRequest
from app.models.dispute import Dispute
from app.models.enums import (
    AccountStatus,
    BubbleJoinStatus,
    BubbleMemberRole,
    BubbleType,
    BubbleVisibility,
    ClaimRequestStatus,
    DisputeStatus,
    NotificationType,
    ReportStatus,
    UserRole,
    VoteType,
)
from app.models.ledger_entry import LedgerEntry
from app.models.notification import Notification
from app.models.report import Report, ReportComment, ReportVote
from app.models.report_bookmark import ReportBookmark
from app.models.user import User
from app.services._helpers import VALID_PLATFORMS
from app.services.scoring_service import (
    DEFAULT_MULTIPLIERS,
    WORKBOOK_FORMULA_VERSION,
    calc_delta,
    calc_multiplier_quotient,
    cap_delta,
    rebuild_account_score,
)

SEED_ADMIN_EMAIL = "seed-admin@shosha.dev"
SEED_ACCOUNT_HANDLE_PREFIX = "seed_account_"
SEED_BUBBLE_NAME_PREFIX = "seed_bubble_"

PLATFORM_LIST = sorted(VALID_PLATFORMS)

# Scoring rows for approved reports (deed, base_score, report_type, category)
SCORING_ROWS = [
    ("Public kindness to strangers", 50.0, "positive", "Social | Interpersonal"),
    ("Standing up for someone", 100.0, "positive", "Social | Interpersonal"),
    ("Sharing helpful information", 50.0, "positive", "Online Behavior"),
    ("Amplifying good causes", 80.0, "positive", "Online Behavior"),
    ("Volunteering", 150.0, "positive", "Community | Public Impact"),
    ("Bullying (offline/online)", -70.0, "negative", "Social | Interpersonal"),
    ("Trolling", -80.0, "negative", "Online Behavior"),
    ("Spreading misinformation", -50.0, "negative", "Online Behavior"),
    ("Being rude / insulting", -20.0, "negative", "Micro | Everyday Actions"),
    ("Hate comments", -50.0, "negative", "Online Behavior"),
]

# 25 reports: (days_ago, status) — spread across W1/W2/W3
REPORT_SCHEDULE: list[tuple[int, ReportStatus]] = [
    (2, ReportStatus.APPROVED),
    (4, ReportStatus.PENDING),
    (5, ReportStatus.APPROVED),
    (1, ReportStatus.PENDING),
    (3, ReportStatus.REJECTED),
    (6, ReportStatus.APPROVED),
    (2, ReportStatus.PENDING),
    (4, ReportStatus.APPROVED),
    (9, ReportStatus.PENDING),
    (10, ReportStatus.APPROVED),
    (11, ReportStatus.REJECTED),
    (8, ReportStatus.PENDING),
    (12, ReportStatus.APPROVED),
    (9, ReportStatus.APPROVED),
    (13, ReportStatus.PENDING),
    (18, ReportStatus.APPROVED),
    (16, ReportStatus.PENDING),
    (20, ReportStatus.REJECTED),
    (15, ReportStatus.APPROVED),
    (17, ReportStatus.PENDING),
    (19, ReportStatus.REJECTED),
    (18, ReportStatus.PENDING),
    (20, ReportStatus.APPROVED),
    (16, ReportStatus.REJECTED),
    (15, ReportStatus.PENDING),
]


@dataclass
class SeedCounts:
    users: int = 0
    users_full: int = 0
    users_partial: int = 0
    users_incomplete: int = 0
    users_admin: int = 0
    accounts: int = 0
    accounts_owned: int = 0
    accounts_unclaimed: int = 0
    reports: int = 0
    reports_pending: int = 0
    reports_approved: int = 0
    reports_rejected: int = 0
    ledger_entries: int = 0
    votes: int = 0
    comments: int = 0
    bookmarks: int = 0
    claims: int = 0
    disputes: int = 0
    notifications: int = 0
    bubbles: int = 0


@dataclass
class SeedContext:
    users: dict[str, User] = field(default_factory=dict)
    accounts: list[Account] = field(default_factory=list)
    reports: list[Report] = field(default_factory=list)
    ledger_entries: list[LedgerEntry] = field(default_factory=list)
    counts: SeedCounts = field(default_factory=SeedCounts)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _days_ago(days: int, hour: int = 12) -> datetime:
    base = _utc_now().replace(hour=hour, minute=0, second=0, microsecond=0)
    return base - timedelta(days=days)


def _guard_production() -> None:
    if settings.ENVIRONMENT.lower() == "production":
        print("ERROR: Refusing to seed database in production environment.", file=sys.stderr)
        sys.exit(1)


async def _seed_marker_exists(session: AsyncSession) -> bool:
    result = await session.execute(select(User.id).where(User.email == SEED_ADMIN_EMAIL).limit(1))
    return result.scalar_one_or_none() is not None


async def _seed_user_ids(session: AsyncSession) -> list[UUID]:
    result = await session.execute(
        select(User.id).where(User.email.like("seed-%@shosha.dev"))
    )
    return list(result.scalars().all())


async def _seed_account_ids(session: AsyncSession, user_ids: list[UUID]) -> list[UUID]:
    result = await session.execute(
        select(Account.id).where(
            or_(
                Account.handle.like(f"{SEED_ACCOUNT_HANDLE_PREFIX}%"),
                Account.owner_user_id.in_(user_ids) if user_ids else False,
            )
        )
    )
    return list(result.scalars().all())


async def _seed_bubble_ids(session: AsyncSession, user_ids: list[UUID]) -> list[UUID]:
    result = await session.execute(
        select(Bubble.id).where(
            or_(
                Bubble.name.like(f"{SEED_BUBBLE_NAME_PREFIX}%"),
                Bubble.created_by.in_(user_ids) if user_ids else False,
            )
        )
    )
    return list(result.scalars().all())


async def delete_seed_data(session: AsyncSession) -> None:
    user_ids = await _seed_user_ids(session)
    account_ids = await _seed_account_ids(session, user_ids)
    bubble_ids = await _seed_bubble_ids(session, user_ids)

    if bubble_ids:
        await session.execute(
            delete(BubbleJoinRequest).where(BubbleJoinRequest.bubble_id.in_(bubble_ids))
        )
        await session.execute(
            delete(BubbleMember).where(BubbleMember.bubble_id.in_(bubble_ids))
        )
        await session.execute(delete(Bubble).where(Bubble.id.in_(bubble_ids)))

    if user_ids:
        await session.execute(delete(Notification).where(Notification.user_id.in_(user_ids)))

    if account_ids:
        report_ids_result = await session.execute(
            select(Report.id).where(Report.account_id.in_(account_ids))
        )
        report_ids = list(report_ids_result.scalars().all())

        if report_ids:
            await session.execute(delete(Dispute).where(Dispute.report_id.in_(report_ids)))
        await session.execute(delete(Dispute).where(Dispute.account_id.in_(account_ids)))
        await session.execute(delete(ClaimRequest).where(ClaimRequest.account_id.in_(account_ids)))

        if report_ids:
            await session.execute(
                delete(ReportBookmark).where(ReportBookmark.report_id.in_(report_ids))
            )
            await session.execute(
                delete(ReportComment).where(ReportComment.report_id.in_(report_ids))
            )
            await session.execute(delete(ReportVote).where(ReportVote.report_id.in_(report_ids)))

        await session.execute(delete(LedgerEntry).where(LedgerEntry.account_id.in_(account_ids)))

        if report_ids:
            await session.execute(delete(Report).where(Report.id.in_(report_ids)))

        await session.execute(
            delete(AccountSocialLink).where(AccountSocialLink.account_id.in_(account_ids))
        )
        await session.execute(delete(Account).where(Account.id.in_(account_ids)))

    if user_ids:
        await session.execute(delete(User).where(User.id.in_(user_ids)))

    await session.commit()
    print("Seed data removed.")


def _build_users() -> list[User]:
    specs = [
        {
            "key": "admin",
            "email": SEED_ADMIN_EMAIL,
            "username": "seed_admin",
            "uid": "seed-uid-001",
            "role": UserRole.ADMIN,
            "display_name": "Seed Admin",
            "bio": "Platform administrator for local development and moderation testing.",
            "headline": "Shosha Dev Admin",
            "city": "Mumbai",
            "website_url": "https://shosha.dev",
            "photo_url": "https://api.dicebear.com/9.x/avataaars/svg?seed=seed_admin",
            "onboarding_complete": True,
        },
        {
            "key": "full1",
            "email": "seed-full1@shosha.dev",
            "username": "seed_full1",
            "uid": "seed-uid-002",
            "display_name": "Priya Sharma",
            "bio": "Investigative journalist covering tech accountability and public figures.",
            "headline": "Founder / Business Owner",
            "city": "Bangalore",
            "website_url": "https://priya-sharma.example.com",
            "photo_url": "https://api.dicebear.com/9.x/avataaars/svg?seed=seed_full1",
            "onboarding_complete": True,
            "trust_badge": True,
        },
        {
            "key": "full2",
            "email": "seed-full2@shosha.dev",
            "username": "seed_full2",
            "uid": "seed-uid-003",
            "display_name": "Arjun Mehta",
            "bio": "Public policy researcher focused on online harm and community safety.",
            "headline": "Public Figure / Influencer",
            "city": "Delhi",
            "website_url": "https://arjun-mehta.example.com",
            "photo_url": "https://api.dicebear.com/9.x/avataaars/svg?seed=seed_full2",
            "onboarding_complete": True,
        },
        {
            "key": "partial1",
            "email": "seed-partial1@shosha.dev",
            "username": "seed_partial1",
            "uid": "seed-uid-004",
            "display_name": "Neha Kapoor",
            "city": "Pune",
            "bio": "Casual reporter — still building out credibility profile.",
            "onboarding_complete": True,
        },
        {
            "key": "partial2",
            "email": "seed-partial2@shosha.dev",
            "username": "seed_partial2",
            "uid": "seed-uid-005",
            "display_name": "Rohan Desai",
            "city": "Chennai",
            "bio": "Tracks local influencer drama and community disputes.",
            "onboarding_complete": True,
        },
        {
            "key": "partial3",
            "email": "seed-partial3@shosha.dev",
            "username": "seed_partial3",
            "uid": "seed-uid-006",
            "display_name": "Ananya Iyer",
            "city": "Hyderabad",
            "bio": "New to Shosha — submits reports with minimal profile data.",
            "onboarding_complete": True,
        },
        {
            "key": "incomplete1",
            "email": "seed-incomplete1@shosha.dev",
            "username": "seed_incomplete1",
            "uid": "seed-uid-007",
            "display_name": "Vikram Singh",
            "onboarding_complete": False,
        },
        {
            "key": "incomplete2",
            "email": "seed-incomplete2@shosha.dev",
            "username": "seed_incomplete2",
            "uid": "seed-uid-008",
            "display_name": "Kavya Reddy",
            "onboarding_complete": False,
        },
    ]

    users: list[User] = []
    for spec in specs:
        user = User(
            firebase_uid=spec["uid"],
            email=spec["email"],
            username=spec["username"],
            display_name=spec.get("display_name"),
            photo_url=spec.get("photo_url"),
            bio=spec.get("bio"),
            headline=spec.get("headline"),
            city=spec.get("city"),
            website_url=spec.get("website_url"),
            role=spec.get("role", UserRole.USER),
            onboarding_complete=spec.get("onboarding_complete", False),
            trust_badge=spec.get("trust_badge"),
            is_active=True,
        )
        users.append(user)
    return users


def _build_account_pairs() -> list[tuple[str, str]]:
    platform_cycle = cycle(PLATFORM_LIST)
    return [(next(platform_cycle), f"{SEED_ACCOUNT_HANDLE_PREFIX}{i:02d}") for i in range(1, 13)]


def _build_accounts(users: dict[str, User]) -> list[Account]:
    pairs = _build_account_pairs()
    display_names = [
        "Nova Creator",
        "ByteBhai",
        "TrendWatch IN",
        "PolicyPulse",
        "ClipKing",
        "LinkedLeader",
        "ThreadHunter",
        "SnapStarlet",
        "WebWatchdog",
        "X-Ray Reports",
        "InstaInsight",
        "MetaMonitor",
    ]
    statuses = (
        [AccountStatus.ACTIVE] * 9
        + [AccountStatus.UNDER_REVIEW, AccountStatus.UNDER_REVIEW, AccountStatus.DISPUTED]
    )
    # 8 owned, 4 unclaimed (indices 0-7 owned, 8-11 unclaimed)
    owner_keys = [
        "admin",
        "full1",
        "full1",
        "full2",
        "partial1",
        "partial2",
        "partial3",
        "incomplete1",
        None,
        None,
        None,
        None,
    ]

    accounts: list[Account] = []
    for idx, ((platform, handle), display_name, status, owner_key) in enumerate(
        zip(pairs, display_names, statuses, owner_keys)
    ):
        accounts.append(
            Account(
                platform=platform,
                handle=handle,
                display_name=display_name,
                bio=f"Seed dossier for {display_name} on {platform}.",
                status=status,
                owner_user_id=users[owner_key].id if owner_key else None,
                score=1000.0,
            )
        )
    return accounts


def _make_ledger_entry(
    account_id: UUID,
    report_id: UUID | None,
    base_score: float,
    category: str,
    deed: str,
    timestamp: datetime,
) -> LedgerEntry:
    multipliers = DEFAULT_MULTIPLIERS.copy()
    raw_delta = calc_delta(base_score, multipliers)
    delta, capped = cap_delta(raw_delta)
    return LedgerEntry(
        account_id=account_id,
        report_id=report_id,
        delta=delta,
        base_score=base_score,
        multiplier_quotient=calc_multiplier_quotient(multipliers),
        multipliers=multipliers,
        formula_version=WORKBOOK_FORMULA_VERSION,
        timestamp=timestamp,
        category=category,
        deed=deed,
        capped=capped,
        cause="report",
    )


async def seed_all(session: AsyncSession) -> SeedContext:
    ctx = SeedContext()

    # --- Users ---
    user_rows = _build_users()
    for user in user_rows:
        session.add(user)
    await session.flush()
    user_keys = ["admin", "full1", "full2", "partial1", "partial2", "partial3", "incomplete1", "incomplete2"]
    ctx.users = dict(zip(user_keys, user_rows, strict=True))

    ctx.counts.users = len(user_rows)
    ctx.counts.users_admin = 1
    ctx.counts.users_full = 2
    ctx.counts.users_partial = 3
    ctx.counts.users_incomplete = 2

    # --- Accounts ---
    ctx.accounts = _build_accounts(ctx.users)
    for account in ctx.accounts:
        session.add(account)
    await session.flush()

    ctx.counts.accounts = len(ctx.accounts)
    ctx.counts.accounts_owned = sum(1 for a in ctx.accounts if a.owner_user_id is not None)
    ctx.counts.accounts_unclaimed = ctx.counts.accounts - ctx.counts.accounts_owned

    admin = ctx.users["admin"]
    reporters = [
        ctx.users["full1"],
        ctx.users["full2"],
        ctx.users["partial1"],
        ctx.users["partial2"],
        ctx.users["partial3"],
        ctx.users["incomplete1"],
    ]

    # --- Reports ---
    report_titles = [
        "Misleading health claims in sponsored post",
        "Community fundraiser handled transparently",
        "Harassment in live stream comments",
        "Fake giveaway scam targeting followers",
        "Plagiarized content from smaller creators",
        "Volunteer effort during local flood relief",
        "Doxxing a critic in group chat",
        "Amplifying verified disaster relief links",
        "Bullying a junior collaborator publicly",
        "Spreading election misinformation thread",
        "Standing up for harassed moderator",
        "Astroturfed positive reviews exposed",
        "Trolling victims of public incident",
        "Ethical whistleblow on workplace abuse",
        "Coordinated brigading on rival creator",
        "Donation drive with published receipts",
        "Impersonation account reported",
        "Hate raid organized via backup account",
        "Mentoring open office hours for newcomers",
        "Cancel mob participation documented",
        "Public kindness after online pile-on",
        "Scam DM templates shared with followers",
        "Environmental cleanup livestream",
        "Gaslighting former business partner",
        "Queue-cutting incident at public event",
    ]

    scoring_idx = 0
    for idx, (days_ago, status) in enumerate(REPORT_SCHEDULE):
        account = ctx.accounts[idx % len(ctx.accounts)]
        reporter = reporters[idx % len(reporters)]
        created_at = _days_ago(days_ago)
        reviewed_at = created_at + timedelta(days=1) if status != ReportStatus.PENDING else None

        deed = None
        base_score = None
        report_type = None
        if status == ReportStatus.APPROVED:
            deed, base_score, report_type, _category = SCORING_ROWS[scoring_idx % len(SCORING_ROWS)]
            scoring_idx += 1

        report = Report(
            account_id=account.id,
            reporter_user_id=reporter.id,
            status=status,
            title=report_titles[idx],
            description=(
                f"Seed report #{idx + 1}: documented behavior on @{account.handle} "
                f"({account.platform}). Evidence collected from public posts."
            ),
            report_type=report_type,
            deed=deed,
            base_score=base_score,
            reviewed_by=admin.id if status != ReportStatus.PENDING else None,
            reviewed_at=reviewed_at,
            reported_at=created_at,
            created_at=created_at,
            updated_at=created_at,
        )
        session.add(report)
        ctx.reports.append(report)

    await session.flush()

    ctx.counts.reports = len(ctx.reports)
    ctx.counts.reports_pending = sum(1 for r in ctx.reports if r.status == ReportStatus.PENDING)
    ctx.counts.reports_approved = sum(1 for r in ctx.reports if r.status == ReportStatus.APPROVED)
    ctx.counts.reports_rejected = sum(1 for r in ctx.reports if r.status == ReportStatus.REJECTED)

    # --- Ledger entries (approved reports + week-bucket extras) ---
    approved_reports = [r for r in ctx.reports if r.status == ReportStatus.APPROVED]
    accounts_with_ledger: set[UUID] = set()

    for report in approved_reports:
        account = next(a for a in ctx.accounts if a.id == report.account_id)
        ts = report.reviewed_at or report.created_at + timedelta(hours=1)
        category = next(
            (c for d, _, _, c in SCORING_ROWS if d == report.deed),
            "Social | Interpersonal",
        )
        entry = _make_ledger_entry(
            account_id=account.id,
            report_id=report.id,
            base_score=float(report.base_score or 50.0),
            category=category,
            deed=report.deed or "Public kindness to strangers",
            timestamp=ts,
        )
        session.add(entry)
        ctx.ledger_entries.append(entry)
        accounts_with_ledger.add(account.id)

    # Extra entries so each account with ledger spans ~2d, ~9d, ~18d buckets
    def _has_entry_in_bucket(account_id: UUID, target_days_ago: int) -> bool:
        target = _days_ago(target_days_ago)
        return any(
            e.account_id == account_id and abs((e.timestamp - target).days) <= 2
            for e in ctx.ledger_entries
        )

    extra_buckets = [(2, 0), (9, 1), (18, 2)]
    for account_id in accounts_with_ledger:
        account = next(a for a in ctx.accounts if a.id == account_id)
        account_approved = [r for r in approved_reports if r.account_id == account_id]
        for days_ago, row_idx in extra_buckets:
            if _has_entry_in_bucket(account_id, days_ago):
                continue
            ts = _days_ago(days_ago, hour=14 + row_idx)
            deed, base_score, _, category = SCORING_ROWS[row_idx % len(SCORING_ROWS)]
            link_report = account_approved[row_idx % len(account_approved)] if account_approved else None
            entry = _make_ledger_entry(
                account_id=account.id,
                report_id=link_report.id if link_report else None,
                base_score=base_score,
                category=category,
                deed=deed,
                timestamp=ts,
            )
            session.add(entry)
            ctx.ledger_entries.append(entry)

    await session.flush()
    ctx.counts.ledger_entries = len(ctx.ledger_entries)

    # Rebuild account scores
    for account_id in accounts_with_ledger:
        account = next(a for a in ctx.accounts if a.id == account_id)
        new_score, breakdown = await rebuild_account_score(session, account.id)
        account.score = new_score
        account.score_breakdown = breakdown

    # --- Votes (20) ---
    seen_votes: set[tuple[UUID, UUID]] = set()
    vote_i = 0
    while ctx.counts.votes < 20:
        report = ctx.reports[vote_i % len(ctx.reports)]
        user = ctx.users[user_keys[vote_i % len(user_keys)]]
        key = (report.id, user.id)
        vote_i += 1
        if key in seen_votes:
            continue
        seen_votes.add(key)
        vote_type = VoteType.ALIGN if ctx.counts.votes % 3 else VoteType.OPPOSE
        session.add(ReportVote(report_id=report.id, user_id=user.id, vote_type=vote_type))
        ctx.counts.votes += 1

    # --- Comments (10) ---
    comment_bodies = [
        "This matches what several followers reported last month.",
        "The evidence links are solid — aligns with archived posts.",
        "I oppose this; context from the full livestream changes the picture.",
        "Important dossier entry for accountability.",
        "Moderators should review the second screenshot closely.",
        "Community consensus seems split on this one.",
        "Verified receipts make this hard to dispute.",
        "Needs more primary sources before we align.",
        "Good documentation of offline behavior too.",
        "The timeline in the description is especially useful.",
    ]
    for i, body in enumerate(comment_bodies):
        session.add(
            ReportComment(
                report_id=ctx.reports[i].id,
                user_id=reporters[i % len(reporters)].id,
                body=body,
            )
        )
        ctx.counts.comments += 1

    # --- Bookmarks (5) ---
    for i in range(5):
        session.add(
            ReportBookmark(
                user_id=reporters[i].id,
                report_id=ctx.reports[i * 2].id,
            )
        )
        ctx.counts.bookmarks += 1

    # --- Claims (2) on unclaimed accounts ---
    unclaimed = [a for a in ctx.accounts if a.owner_user_id is None]
    pending_claim = ClaimRequest(
        account_id=unclaimed[0].id,
        requester_user_id=ctx.users["partial1"].id,
        status=ClaimRequestStatus.PENDING,
        evidence_type="profile_screenshot",
        evidence_payload={"note": "Seed pending claim evidence"},
    )
    decided_claim = ClaimRequest(
        account_id=unclaimed[1].id,
        requester_user_id=ctx.users["partial2"].id,
        status=ClaimRequestStatus.APPROVED,
        evidence_type="verified_post",
        evidence_payload={"note": "Seed approved claim evidence"},
        reviewed_by=admin.id,
        reviewed_at=_days_ago(3),
    )
    session.add(pending_claim)
    session.add(decided_claim)
    ctx.counts.claims = 2

    # --- Disputes (2) on owned account reports ---
    owned_with_reports = [a for a in ctx.accounts if a.owner_user_id is not None][:2]
    for i, account in enumerate(owned_with_reports):
        account_reports = [r for r in ctx.reports if r.account_id == account.id]
        if not account_reports:
            continue
        report = account_reports[0]
        owner = next(u for u in ctx.users.values() if u.id == account.owner_user_id)
        dispute = Dispute(
            report_id=report.id,
            account_id=account.id,
            requester_user_id=owner.id,
            status=DisputeStatus.PENDING if i == 0 else DisputeStatus.ACCEPTED,
            reason="Seed dispute: evidence does not reflect full context of the incident.",
            evidence_url="https://example.com/seed-dispute-evidence.png",
            reviewed_by=None if i == 0 else admin.id,
            reviewed_at=None if i == 0 else _days_ago(2),
        )
        session.add(dispute)
        ctx.counts.disputes += 1

    # --- Notifications (5) ---
    notif_specs = [
        (ctx.users["full1"], NotificationType.REPORT, False, "New align on your report", "Someone aligned with your seed report."),
        (ctx.users["partial1"], NotificationType.CLAIM, False, "Claim submitted", "Your claim request is pending review."),
        (ctx.users["partial2"], NotificationType.CLAIM, True, "Claim approved", "Your claim was approved by moderators."),
        (ctx.users["full2"], NotificationType.DISPUTE, False, "Dispute filed", "A dispute was filed on a report you follow."),
        (ctx.users["admin"], NotificationType.MODERATION, True, "Reports awaiting review", "Seed queue has pending moderation items."),
    ]
    for user, ntype, is_read, title, message in notif_specs:
        session.add(
            Notification(
                user_id=user.id,
                notification_type=ntype,
                title=title,
                message=message,
                is_read=is_read,
                read_at=_days_ago(1) if is_read else None,
                metadata_json={"seed": True},
            )
        )
        ctx.counts.notifications += 1

    # --- Bubbles ---
    bubble1 = Bubble(
        name=f"{SEED_BUBBLE_NAME_PREFIX}01",
        tagline="Seed friend group for dev testing",
        description="A public seed bubble with mixed member roles for leaderboard and join flows.",
        bubble_type=BubbleType.FRIEND_GROUP,
        category="dev",
        created_by=admin.id,
        visibility=BubbleVisibility.PUBLIC,
    )
    bubble2 = Bubble(
        name=f"{SEED_BUBBLE_NAME_PREFIX}02",
        tagline="Seed work group with pending join",
        description="Private-ish work bubble used to test join request approval workflow.",
        bubble_type=BubbleType.WORK_GROUP,
        category="dev",
        created_by=ctx.users["full1"].id,
        visibility=BubbleVisibility.PUBLIC,
    )
    session.add(bubble1)
    session.add(bubble2)
    await session.flush()
    ctx.counts.bubbles = 2

    bubble1_members = [
        (admin, BubbleMemberRole.OWNER),
        (ctx.users["full1"], BubbleMemberRole.MEMBER),
        (ctx.users["full2"], BubbleMemberRole.MEMBER),
        (ctx.users["partial1"], BubbleMemberRole.MEMBER),
    ]
    bubble2_members = [
        (ctx.users["full1"], BubbleMemberRole.OWNER),
        (ctx.users["full2"], BubbleMemberRole.MEMBER),
        (ctx.users["partial3"], BubbleMemberRole.MEMBER),
    ]
    for user, role in bubble1_members:
        session.add(
            BubbleMember(
                bubble_id=bubble1.id,
                user_id=user.id,
                role=role,
                score=1000.0 if role == BubbleMemberRole.OWNER else 850.0,
                joined_at=_days_ago(10),
            )
        )
    for user, role in bubble2_members:
        session.add(
            BubbleMember(
                bubble_id=bubble2.id,
                user_id=user.id,
                role=role,
                score=920.0,
                joined_at=_days_ago(7),
            )
        )

    # Pending join on bubble2 from incomplete2 (not a member)
    session.add(
        BubbleJoinRequest(
            bubble_id=bubble2.id,
            user_id=ctx.users["incomplete2"].id,
            status=BubbleJoinStatus.PENDING,
            approvals=[],
            rejections=[],
        )
    )

    await session.commit()
    return ctx


def _print_summary(ctx: SeedContext) -> None:
    c = ctx.counts
    print("Seed complete:")
    print(
        f"  Users: {c.users} ({c.users_full} full profile, {c.users_partial} partial, "
        f"{c.users_incomplete} incomplete onboarding, {c.users_admin} admin)"
    )
    print(f"  Accounts: {c.accounts} ({c.accounts_owned} owned, {c.accounts_unclaimed} unclaimed)")
    print(
        f"  Reports: {c.reports} ({c.reports_pending} pending, "
        f"{c.reports_approved} approved, {c.reports_rejected} rejected)"
    )
    print(f"  Ledger entries: {c.ledger_entries} (spanning 21 days)")
    print(f"  Votes: {c.votes}, Comments: {c.comments}, Bookmarks: {c.bookmarks}")
    print(f"  Claims: {c.claims}, Disputes: {c.disputes}, Notifications: {c.notifications}")
    print(f"  Bubbles: {c.bubbles}")
    print()
    print(f"Admin login (mock mode): {SEED_ADMIN_EMAIL}")


async def main(reset: bool) -> None:
    _guard_production()

    async with async_session_maker() as session:
        if await _seed_marker_exists(session):
            if not reset:
                print("Already seeded, skipping")
                return
            await delete_seed_data(session)

        ctx = await seed_all(session)
        _print_summary(ctx)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Dev-only Shosha V2 database seed")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete seed-tagged rows and reseed",
    )
    args = parser.parse_args()
    asyncio.run(main(reset=args.reset))
