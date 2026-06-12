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

import logging
import math
import re
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.ledger_entry import LedgerEntry
from app.models.report import Report
from app.core.scoring_constants import BASE_SCORE
from app.repositories import ledger_repository

logger = logging.getLogger(__name__)
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


# Workbook multiplier lookup tables — ported value-for-value from V1.
# Keys must match V1 workbook vocabulary — see Shoshaaahhh/src/lib/scoring.ts.
WORKBOOK_ROLE_POWER: dict[str, float] = {
    "student_unemployed": 0.5,
    "student": 0.5,
    "unemployed": 0.5,
    "individual_contributor_job": 1,
    "individual_contributor": 1,
    "manager": 1.5,
    "founder_business_owner": 2,
    "public_figure_influencer": 2.5,
    "government_political_role": 3,
    "government_political": 3,
}

# Keys must match V1 workbook vocabulary — see Shoshaaahhh/src/lib/scoring.ts.
WORKBOOK_REACH_RESPONSIBILITY: dict[str, float] = {
    "none": 0.5,
    "1k": 1,
    "1k_10k": 1.5,
    "10k_100k": 2,
    "100k_1m": 2.5,
    "1m": 3,
    "10m_100m": 3,
    "100m": 3,
}

# Keys must match V1 workbook vocabulary — see Shoshaaahhh/src/lib/scoring.ts.
WORKBOOK_EDUCATION_AWARENESS: dict[str, float] = {
    "no_formal_education": 0.5,
    "no_formal": 0.5,
    "school": 1,
    "undergraduate": 1.5,
    "postgraduate": 2,
    "doctorate_specialized": 2.5,
    "field_contributor": 3,
}

# Keys must match V1 workbook vocabulary — see Shoshaaahhh/src/lib/scoring.ts.
WORKBOOK_SPECIALIZED_IDENTITY: dict[str, float] = {
    "no": 0.5,
    "some_experience": 1,
    "professional": 1.5,
    "expert": 2,
}

# Keys must match V1 workbook vocabulary — see Shoshaaahhh/src/lib/scoring.ts.
WORKBOOK_MANAGEMENT_MEANS: dict[str, float] = {
    "none": 1,
    "small_team_limited_control": 1.5,
    "moderate_responsibility": 2,
    "large_team_major_decisions": 2.5,
    "organizational_institutional_control": 3,
    "organizational_institutional": 3,
}

# Keys must match V1 workbook vocabulary — see Shoshaaahhh/src/lib/scoring.ts.
WORKBOOK_REGION_ENVIRONMENT: dict[str, float] = {
    "syria_palestine_lebanon": 0.5,
    "rest_of_the_world": 1,
    "rest_of_asia_rest_of_africa": 1.5,
    "india_se_asia_north_africa_south_america": 2,
    "india": 2,
    "gcc": 2.5,
    "east_asia_russia_east_europe_middle_east": 2.5,
    "usa_canada": 3,
    "us_west_europe_aus_nz": 3,
    "west_europe": 3,
}

# Keys must match V1 workbook vocabulary — see Shoshaaahhh/src/lib/scoring.ts.
WORKBOOK_ABILITY: dict[str, float] = {
    "yes": 0.5,
    "prefer_not_to_say": 1,
    "no": 1,
}

# Keys must match V1 workbook vocabulary — see Shoshaaahhh/src/lib/scoring.ts.
WORKBOOK_LIFESTYLE_CIRCUMSTANCES: dict[str, float] = {
    "high_pressure": 0.5,
    "balanced": 1,
    "manageable": 1.5,
    "comfortable": 2,
    "well_supported": 2.5,
    "ideal": 3,
}


def _lookup_workbook_value(
    value: str | None, table: dict[str, float], fallback: float = 1.0
) -> float:
    """Port of V1 lookupWorkbookValue.

    Returns ``fallback`` for empty/missing values. A non-null value that does
    not match any table key after normalization logs a warning (never raises)
    so misconfigured workbook fields are visible rather than silently neutral.
    """
    if not value:
        return fallback
    normalized = _normalize_lookup(value)
    if normalized not in table:
        logger.warning(
            "workbook lookup miss: value=%r normalized=%r did not match any key",
            value,
            normalized,
        )
        return fallback
    return table[normalized]


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


def resolve_sheet_base_impact_from_admin_impact(
    final_impact: float, fallback_type: str | None
) -> dict:
    """Port of V1 resolveSheetBaseImpactFromAdminImpact.

    Picks the SHEET_SCORING_INDEX row of matching sign whose abs(base_score)
    is closest to abs(final_impact) * 10 (reverse of delta = baseScore / 10 at
    neutral multipliers).
    """
    if final_impact > 0:
        impact_type = "positive"
    elif final_impact < 0:
        impact_type = "negative"
    else:
        impact_type = fallback_type

    target = abs(final_impact) * 10
    candidates = [row for row in SHEET_SCORING_INDEX if row["type"] == impact_type]
    if not candidates or target == 0:
        return resolve_sheet_base_impact("", impact_type)

    best = candidates[0]
    for row in candidates[1:]:
        if abs(abs(row["base_score"]) - target) < abs(abs(best["base_score"]) - target):
            best = row
    return best


def cap_delta(
    delta: float, cap: float = SINGLE_REPORT_DELTA_CAP
) -> tuple[float, bool]:
    """Cap delta at +/- cap. Returns (capped_delta, was_capped)."""
    if delta > cap:
        return cap, True
    if delta < -cap:
        return -cap, True
    return delta, False


def profile_multipliers_from_account(
    account: Account,
    repetition_pattern: float | None = None,
    intent: float | None = None,
    circumstances: float | None = None,
) -> dict[str, float]:
    """Port of V1 profileMultipliersFromWorkbookProfile.

    Reads workbook fields directly off the Account document (NOT a User
    onboarding record). Absent fields fall back to neutral multipliers (1.0).
    Per-event overrides (repetition_pattern, intent, circumstances) take
    precedence over the account-derived values when provided.
    """
    opposed_posts = account.opposed_posts or 0
    if repetition_pattern is not None:
        repetition = repetition_pattern
    else:
        repetition = max(0.5, min(3, 0.5 + (opposed_posts / 10)))

    specialized_identity = _lookup_workbook_value(
        account.specialized_field_workbook, WORKBOOK_SPECIALIZED_IDENTITY, 1
    )

    return {
        "reputation": repetition,
        "intent": intent if intent is not None else 1.0,
        "identity": min(3, specialized_identity),
        "power": _lookup_workbook_value(account.role, WORKBOOK_ROLE_POWER, 1),
        "means": _lookup_workbook_value(
            account.management_workbook, WORKBOOK_MANAGEMENT_MEANS, 1
        ),
        "environment": _lookup_workbook_value(
            account.region, WORKBOOK_REGION_ENVIRONMENT, 1
        ),
        "ability": _lookup_workbook_value(account.disability, WORKBOOK_ABILITY, 1),
        "circumstances": circumstances
        if circumstances is not None
        else _lookup_workbook_value(
            account.lifestyle, WORKBOOK_LIFESTYLE_CIRCUMSTANCES, 1
        ),
        "responsibility": _lookup_workbook_value(
            account.reach, WORKBOOK_REACH_RESPONSIBILITY, 1
        ),
        "awareness": max(
            _lookup_workbook_value(
                account.education_workbook, WORKBOOK_EDUCATION_AWARENESS, 1
            ),
            min(3, specialized_identity + 0.5),
        ),
    }


def sum_deltas_by_age(
    entries: list, now: datetime | None = None
) -> dict[str, float]:
    """Port of V1 sumDeltasByAge.

    Buckets ledger deltas by age: window 1 (<=7d), window 2 (<=30d),
    window 3 (>30d). Entries are objects with `timestamp` (datetime) and
    `delta` (float).
    """
    now = now or datetime.now(timezone.utc)
    w1_delta = 0.0
    w2_delta = 0.0
    w3_delta = 0.0
    for entry in entries:
        when = getattr(entry, "timestamp", None)
        delta = getattr(entry, "delta", None)
        if when is None or not isinstance(delta, (int, float)):
            continue
        age_days = max(0.0, (now - when).total_seconds() / (24 * 60 * 60))
        if age_days <= 7:
            w1_delta += delta
        elif age_days <= 30:
            w2_delta += delta
        else:
            w3_delta += delta
    return {
        "w1_delta": _round_to(w1_delta, 1),
        "w2_delta": _round_to(w2_delta, 1),
        "w3_delta": _round_to(w3_delta, 1),
    }


def calc_sheet_score_tracker(
    base_score: float, w1_delta: float, w2_delta: float, w3_delta: float
) -> dict:
    """Port of V1 calcSheetScoreTracker.

    Sequentially applies apply_sheet_score per window starting from base_score.
    """
    w1_score, w1_decay = apply_sheet_score(base_score, w1_delta)
    w2_score, w2_decay = apply_sheet_score(w1_score, w2_delta)
    w3_score, w3_decay = apply_sheet_score(w2_score, w3_delta)
    return {
        "base_score": base_score,
        "w1_delta": w1_delta,
        "w1_decay": w1_decay,
        "w1_score": w1_score,
        "w2_delta": w2_delta,
        "w2_decay": w2_decay,
        "w2_score": w2_score,
        "w3_delta": w3_delta,
        "w3_decay": w3_decay,
        "w3_score": w3_score,
        "final_score": w3_score,
    }


def calc_window_scores_from_entries(
    entries: list, base_score: float = BASE_SCORE, now: datetime | None = None
) -> dict:
    """Port of V1 calcWorkbookScoreFromEntries.

    Buckets entry deltas by age then runs the sequential window tracker.
    """
    buckets = sum_deltas_by_age(entries, now)
    return calc_sheet_score_tracker(
        base_score,
        buckets["w1_delta"],
        buckets["w2_delta"],
        buckets["w3_delta"],
    )


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
    category_override: str | None = None,
) -> tuple[float, LedgerEntry]:
    """Apply an approved report's score impact and persist a ledger entry.

    Idempotent at the call site is the caller's responsibility; this creates a
    new ledger row, rebuilds the account score, and commits. ``category_override``
    (when truthy) sets the ledger entry's category, mirroring V1 where the
    adjudicated category lands only on the ledger entry, never on the report.
    """
    if report.base_score is not None:
        base_score = float(report.base_score)
        deed = report.deed
        category = report.deed
    else:
        scoring_row = resolve_sheet_base_impact(report.deed, report.report_type)
        base_score = float(scoring_row["base_score"])
        category = scoring_row["category"]
        deed = scoring_row["deed"]

    if category_override:
        category = category_override

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
