"""Shosha scoring engine.

Pure business logic ported from V1 `src/lib/scoring.ts` and
`src/lib/services/ledgerReplay.ts`. The workbook formula is:

    Score0 = 1000
    multiplierQuotient = RP * IN * IY * P * M * E * AB * C * RY * AW
    delta = baseScore * multiplierQuotient / 10
    decay = abs(delta) / (abs(delta) + WORKBOOK_DECAY_DENOMINATOR)
    nextScore = round(previousScore + delta * (decay + 1), 1)

This module never raises HTTPException; callers handle errors. Ledger entries
are never updated (only created or deleted), and `account.score` is always
rebuilt from the ledger rather than mutated incrementally.
"""

from __future__ import annotations

import math
import re
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.ledger_entry import LedgerEntry
from app.models.report import Report
from app.core.scoring_constants import BASE_SCORE
from app.repositories import ledger_repository
WORKBOOK_DECAY_DENOMINATOR = 1000.0
WORKBOOK_FORMULA_VERSION = "workbook-v1"

SINGLE_REPORT_DELTA_CAP = 500.0

DEFAULT_MULTIPLIERS: dict[str, float] = {
    "identity": 1.0,
    "power": 1.0,
    "means": 1.0,
    "environment": 1.0,
    "awareness": 1.0,
    "ability": 1.0,
    "circumstances": 1.0,
    "responsibility": 1.0,
    "intent": 1.0,
    "reputation": 1.0,
}

_TRAIT_KEYS = ("authenticity", "engagement", "community", "content", "impact")

# Full workbook scoring index ported verbatim from V1 SHEET_SCORING_INDEX.
SHEET_SCORING_INDEX: list[dict] = [
    {"category": "Micro | Everyday Actions", "deed": "Cleaning shared spaces", "type": "positive", "base_score": 20},
    {"category": "Micro | Everyday Actions", "deed": "Returning lost items", "type": "positive", "base_score": 20},
    {"category": "Micro | Everyday Actions", "deed": "Holding doors / basic courtesy", "type": "positive", "base_score": 10},
    {"category": "Micro | Everyday Actions", "deed": "Helping someone with small tasks", "type": "positive", "base_score": 30},
    {"category": "Micro | Everyday Actions", "deed": "Giving directions / assistance", "type": "positive", "base_score": 20},
    {"category": "Micro | Everyday Actions", "deed": "Littering", "type": "negative", "base_score": -10},
    {"category": "Micro | Everyday Actions", "deed": "Being rude / insulting", "type": "negative", "base_score": -20},
    {"category": "Micro | Everyday Actions", "deed": "Cutting queues", "type": "negative", "base_score": -30},
    {"category": "Micro | Everyday Actions", "deed": "Ignoring basic courtesy", "type": "negative", "base_score": -10},
    {"category": "Micro | Everyday Actions", "deed": "Minor harassment (offline/online)", "type": "negative", "base_score": -30},
    {"category": "Social | Interpersonal", "deed": "Supporting a friend emotionally", "type": "positive", "base_score": 50},
    {"category": "Social | Interpersonal", "deed": "Resolving conflict peacefully", "type": "positive", "base_score": 70},
    {"category": "Social | Interpersonal", "deed": "Standing up for someone", "type": "positive", "base_score": 100},
    {"category": "Social | Interpersonal", "deed": "Mentoring / guiding", "type": "positive", "base_score": 70},
    {"category": "Social | Interpersonal", "deed": "Public kindness to strangers", "type": "positive", "base_score": 50},
    {"category": "Social | Interpersonal", "deed": "Bullying (offline/online)", "type": "negative", "base_score": -70},
    {"category": "Social | Interpersonal", "deed": "Public humiliation", "type": "negative", "base_score": -100},
    {"category": "Social | Interpersonal", "deed": "Gaslighting / manipulation", "type": "negative", "base_score": -50},
    {"category": "Social | Interpersonal", "deed": "Harassment / stalking", "type": "negative", "base_score": -100},
    {"category": "Social | Interpersonal", "deed": "Spreading rumors", "type": "negative", "base_score": -70},
    {"category": "Online Behavior", "deed": "Sharing helpful information", "type": "positive", "base_score": 50},
    {"category": "Online Behavior", "deed": "Educating / awareness content", "type": "positive", "base_score": 50},
    {"category": "Online Behavior", "deed": "Amplifying good causes", "type": "positive", "base_score": 80},
    {"category": "Online Behavior", "deed": "Calling out injustice responsibly", "type": "positive", "base_score": 120},
    {"category": "Online Behavior", "deed": "Hate comments", "type": "negative", "base_score": -50},
    {"category": "Online Behavior", "deed": "Trolling", "type": "negative", "base_score": -80},
    {"category": "Online Behavior", "deed": "Doxxing", "type": "negative", "base_score": -120},
    {"category": "Online Behavior", "deed": "Spreading misinformation", "type": "negative", "base_score": -50},
    {"category": "Online Behavior", "deed": "Cancel mob participation", "type": "negative", "base_score": -80},
    {"category": "Online Behavior", "deed": "Impersonation", "type": "negative", "base_score": -120},
    {"category": "Financial | Transactional", "deed": "Lending money", "type": "positive", "base_score": 100},
    {"category": "Financial | Transactional", "deed": "Donating", "type": "positive", "base_score": 200},
    {"category": "Financial | Transactional", "deed": "Paying fairly", "type": "positive", "base_score": 100},
    {"category": "Financial | Transactional", "deed": "Supporting small businesses", "type": "positive", "base_score": 200},
    {"category": "Financial | Transactional", "deed": "Funding education / causes", "type": "positive", "base_score": 300},
    {"category": "Financial | Transactional", "deed": "Scamming / fraud", "type": "negative", "base_score": -200},
    {"category": "Financial | Transactional", "deed": "Not repaying loans", "type": "negative", "base_score": -100},
    {"category": "Financial | Transactional", "deed": "Exploiting workers", "type": "negative", "base_score": -300},
    {"category": "Financial | Transactional", "deed": "Bribery", "type": "negative", "base_score": -300},
    {"category": "Financial | Transactional", "deed": "Tax evasion", "type": "negative", "base_score": -200},
    {"category": "Financial | Transactional", "deed": "Financial manipulation", "type": "negative", "base_score": -100},
    {"category": "Professional | Power Use", "deed": "Creating jobs", "type": "positive", "base_score": 600},
    {"category": "Professional | Power Use", "deed": "Ethical leadership", "type": "positive", "base_score": 400},
    {"category": "Professional | Power Use", "deed": "Fair hiring", "type": "positive", "base_score": 200},
    {"category": "Professional | Power Use", "deed": "Whistleblowing", "type": "positive", "base_score": 600},
    {"category": "Professional | Power Use", "deed": "Building useful products", "type": "positive", "base_score": 400},
    {"category": "Professional | Power Use", "deed": "Abuse of power", "type": "negative", "base_score": -400},
    {"category": "Professional | Power Use", "deed": "Workplace harassment", "type": "negative", "base_score": -600},
    {"category": "Professional | Power Use", "deed": "Discrimination", "type": "negative", "base_score": -400},
    {"category": "Professional | Power Use", "deed": "Corruption", "type": "negative", "base_score": -400},
    {"category": "Professional | Power Use", "deed": "Exploitation", "type": "negative", "base_score": -200},
    {"category": "Professional | Power Use", "deed": "Unethical decisions affecting others", "type": "negative", "base_score": -200},
    {"category": "Community | Public Impact", "deed": "Volunteering", "type": "positive", "base_score": 150},
    {"category": "Community | Public Impact", "deed": "Organizing community help", "type": "positive", "base_score": 300},
    {"category": "Community | Public Impact", "deed": "Environmental action (cleanup, planting)", "type": "positive", "base_score": 500},
    {"category": "Community | Public Impact", "deed": "Disaster relief participation", "type": "positive", "base_score": 300},
    {"category": "Community | Public Impact", "deed": "Public nuisance", "type": "negative", "base_score": -150},
    {"category": "Community | Public Impact", "deed": "Vandalism", "type": "negative", "base_score": -300},
    {"category": "Community | Public Impact", "deed": "Environmental damage", "type": "negative", "base_score": -300},
    {"category": "Community | Public Impact", "deed": "Inciting unrest", "type": "negative", "base_score": -500},
    {"category": "Community | Public Impact", "deed": "Destroying public property", "type": "negative", "base_score": -300},
    {"category": "Health | Safety", "deed": "Helping injured people", "type": "positive", "base_score": 300},
    {"category": "Health | Safety", "deed": "Donating blood/organs", "type": "positive", "base_score": 600},
    {"category": "Health | Safety", "deed": "Saving someone in danger", "type": "positive", "base_score": 900},
    {"category": "Health | Safety", "deed": "Promoting safety", "type": "positive", "base_score": 300},
    {"category": "Health | Safety", "deed": "Drunk driving", "type": "negative", "base_score": -600},
    {"category": "Health | Safety", "deed": "Negligence causing harm", "type": "negative", "base_score": -300},
    {"category": "Health | Safety", "deed": "Endangering others", "type": "negative", "base_score": -900},
    {"category": "Health | Safety", "deed": "Ignoring safety protocols", "type": "negative", "base_score": -300},
    {"category": "Legal | Criminal", "deed": "Reporting crime responsibly", "type": "positive", "base_score": 200},
    {"category": "Legal | Criminal", "deed": "Cooperating with law enforcement", "type": "positive", "base_score": 300},
    {"category": "Legal | Criminal", "deed": "Legal advocacy", "type": "positive", "base_score": 200},
    {"category": "Legal | Criminal", "deed": "Theft", "type": "negative", "base_score": -300},
    {"category": "Legal | Criminal", "deed": "Assault", "type": "negative", "base_score": -500},
    {"category": "Legal | Criminal", "deed": "Kidnapping", "type": "negative", "base_score": -700},
    {"category": "Legal | Criminal", "deed": "Sexual assault", "type": "negative", "base_score": -900},
    {"category": "Legal | Criminal", "deed": "Murder", "type": "negative", "base_score": -1000},
    {"category": "Legal | Criminal", "deed": "Organized crime", "type": "negative", "base_score": -1000},
    {"category": "Large Scale | Systemic", "deed": "Policy improving lives", "type": "positive", "base_score": 500},
    {"category": "Large Scale | Systemic", "deed": "Large-scale philanthropy", "type": "positive", "base_score": 800},
    {"category": "Large Scale | Systemic", "deed": "Infrastructure development", "type": "positive", "base_score": 500},
    {"category": "Large Scale | Systemic", "deed": "Conflict resolution", "type": "positive", "base_score": 800},
    {"category": "Large Scale | Systemic", "deed": "War crimes", "type": "negative", "base_score": -1000},
    {"category": "Large Scale | Systemic", "deed": "Genocide", "type": "negative", "base_score": -1000},
    {"category": "Large Scale | Systemic", "deed": "Mass corruption", "type": "negative", "base_score": -1000},
    {"category": "Large Scale | Systemic", "deed": "Large-scale exploitation", "type": "negative", "base_score": -1000},
    {"category": "Large Scale | Systemic", "deed": "Economic harm affecting populations", "type": "negative", "base_score": -800},
    {"category": "Extreme Impact", "deed": "Saving a life", "type": "positive", "base_score": 1000},
    {"category": "Extreme Impact", "deed": "Saving multiple lives", "type": "positive", "base_score": 1500},
    {"category": "Extreme Impact", "deed": "Large rescue", "type": "positive", "base_score": 2500},
    {"category": "Extreme Impact", "deed": "Mass rescue / disaster intervention", "type": "positive", "base_score": 3500},
    {"category": "Extreme Impact", "deed": "City-scale life impact / relief", "type": "positive", "base_score": 5000},
    {"category": "Extreme Impact", "deed": "Nation-scale humanitarian action", "type": "positive", "base_score": 8000},
    {"category": "Extreme Impact", "deed": "Global / historic life-saving impact", "type": "positive", "base_score": 10000},
    {"category": "Extreme Impact", "deed": "Murder / rape", "type": "negative", "base_score": -1000},
    {"category": "Extreme Impact", "deed": "Multiple victims", "type": "negative", "base_score": -1500},
    {"category": "Extreme Impact", "deed": "Mass violence incident", "type": "negative", "base_score": -2500},
    {"category": "Extreme Impact", "deed": "Large-scale violent event / riot causing deaths", "type": "negative", "base_score": -3500},
    {"category": "Extreme Impact", "deed": "City-scale harm / coordinated violence", "type": "negative", "base_score": -5000},
    {"category": "Extreme Impact", "deed": "Nation-scale harm / war-level impact", "type": "negative", "base_score": -8000},
    {"category": "Extreme Impact", "deed": "Genocide / war crimes / systemic mass killing", "type": "negative", "base_score": -10000},
]


def _js_round(value: float) -> float:
    """Mimic JavaScript Math.round (half rounds toward +Infinity)."""
    return math.floor(value + 0.5)


def _round_to(value: float, digits: int = 1) -> float:
    """Port of V1 roundTo (Math.round((value + EPSILON) * factor) / factor)."""
    factor = 10**digits
    return _js_round((value + 2.220446049250313e-16) * factor) / factor


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def _normalize_lookup(value: str) -> str:
    """Port of V1 normalizeLookup."""
    lowered = value.strip().lower()
    lowered = re.sub(r"[^a-z0-9]+", "_", lowered)
    return re.sub(r"^_+|_+$", "", lowered)


def calc_multiplier_quotient(multipliers: dict) -> float:
    """multiplierQuotient = RP * IN * IY * P * M * E * AB * C * RY * AW."""
    return _round_to(
        multipliers["reputation"]
        * multipliers["intent"]
        * multipliers["identity"]
        * multipliers["power"]
        * multipliers["means"]
        * multipliers["environment"]
        * multipliers["ability"]
        * multipliers["circumstances"]
        * multipliers["responsibility"]
        * multipliers["awareness"],
        4,
    )


def calc_delta(base_score: float, multipliers: dict) -> float:
    """delta = baseScore * multiplierQuotient / 10 (rounded to 1 decimal)."""
    return _round_to((base_score * calc_multiplier_quotient(multipliers)) / 10, 1)


def sheet_decay(delta: float) -> float:
    """decay = abs(delta) / (abs(delta) + WORKBOOK_DECAY_DENOMINATOR)."""
    abs_delta = abs(delta)
    return abs_delta / (abs_delta + WORKBOOK_DECAY_DENOMINATOR)


def apply_sheet_score(previous_score: float, delta: float) -> tuple[float, float]:
    """newScore = round(previousScore + delta * (decay + 1), 1).

    Returns (new_score, decay).
    """
    decay = sheet_decay(delta)
    return _round_to(previous_score + delta * (decay + 1), 1), decay


def resolve_sheet_base_impact(deed: str | None, report_type: str | None) -> dict:
    """Port of V1 resolveSheetBaseImpact with normalized deed/category match."""
    normalized = _normalize_lookup(deed or "")
    for row in SHEET_SCORING_INDEX:
        matches = (
            _normalize_lookup(row["deed"]) == normalized
            or _normalize_lookup(row["category"]) == normalized
        )
        if matches and (not report_type or row["type"] == report_type):
            return row

    if report_type == "positive":
        return {
            "category": "Social | Interpersonal",
            "deed": "Public kindness to strangers",
            "type": "positive",
            "base_score": 50,
        }
    return {
        "category": "Social | Interpersonal",
        "deed": "Public humiliation",
        "type": "negative",
        "base_score": -100,
    }


def cap_delta(
    delta: float, cap: float = SINGLE_REPORT_DELTA_CAP
) -> tuple[float, bool]:
    """Cap delta at +/- cap. Returns (capped_delta, was_capped)."""
    if delta > cap:
        return cap, True
    if delta < -cap:
        return -cap, True
    return delta, False


def _apply_impact_to_breakdown(
    breakdown: dict[str, float],
    impact: float,
    category_tags: list[str],
) -> None:
    """Port of V1 applyImpact breakdown distribution."""
    weights = [2 if trait in category_tags else 1 for trait in _TRAIT_KEYS]
    weight_total = sum(weights)
    for index, trait in enumerate(_TRAIT_KEYS):
        share = (impact * weights[index]) / weight_total
        breakdown[trait] = _js_round(_clamp(breakdown[trait] + share, 0, 100))


def _default_breakdown() -> dict[str, float]:
    return {trait: 60.0 for trait in _TRAIT_KEYS}


async def rebuild_account_score(
    db: AsyncSession,
    account_id: UUID,
) -> tuple[float, dict]:
    """Recompute an account's score and trait breakdown from its ledger.

    Walks ledger entries chronologically applying the workbook score formula
    from BASE_SCORE, and distributes each delta across the trait breakdown.
    """
    entries = await ledger_repository.list_for_account(db, account_id)

    score = BASE_SCORE
    breakdown = _default_breakdown()
    for entry in entries:
        score, _decay = apply_sheet_score(score, entry.delta)
        category_tags = (
            [tag for tag in entry.category.split(",") if tag]
            if entry.category
            else []
        )
        _apply_impact_to_breakdown(breakdown, entry.delta, category_tags)

    return score, breakdown


async def apply_report_score(
    db: AsyncSession,
    report: Report,
    account: Account,
    multipliers: dict,
) -> tuple[float, LedgerEntry]:
    """Apply an approved report's score impact and persist a ledger entry.

    Idempotent at the call site is the caller's responsibility; this creates a
    new ledger row, rebuilds the account score, and commits.
    """
    if report.base_score is not None:
        base_score = float(report.base_score)
        category = report.deed
        deed = report.deed
    else:
        scoring_row = resolve_sheet_base_impact(report.deed, report.report_type)
        base_score = float(scoring_row["base_score"])
        category = scoring_row["category"]
        deed = scoring_row["deed"]

    raw_delta = calc_delta(base_score, multipliers)
    delta, capped = cap_delta(raw_delta)
    quotient = calc_multiplier_quotient(multipliers)

    entry = await ledger_repository.create(
        db,
        account_id=account.id,
        report_id=report.id,
        delta=delta,
        base_score=base_score,
        multiplier_quotient=quotient,
        multipliers=multipliers,
        formula_version=WORKBOOK_FORMULA_VERSION,
        timestamp=report.reviewed_at,
        category=category,
        deed=deed,
        capped=capped,
        cause="report",
    )

    new_score, breakdown = await rebuild_account_score(db, account.id)
    account.score = new_score
    account.score_breakdown = breakdown

    await db.commit()
    return new_score, entry


async def reverse_report_score(
    db: AsyncSession,
    report: Report,
    account: Account,
) -> float:
    """Remove a report's ledger entry and rebuild the account score."""
    await ledger_repository.delete_by_report_id(db, report.id)

    new_score, breakdown = await rebuild_account_score(db, account.id)
    account.score = new_score
    account.score_breakdown = breakdown

    await db.commit()
    return new_score
