from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.user import User

CRED_SECTIONS = {
    "basic_info": {"weight": 25, "label": "Basic Info"},
    "questions": {"weight": 25, "label": "Questions"},
    "social_links": {"weight": 10, "label": "Social Links"},
    "profile_extras": {"weight": 15, "label": "Profile Extras"},
    "verification": {"weight": 20, "label": "Verification"},
}

SOCIAL_LINKS_GATE = 4

BASIC_FIELDS = ("name", "username", "phone", "dob", "city", "country")
QUESTION_FIELDS = (
    "occupation_role",
    "network_size",
    "education",
    "specialized_field",
    "manages_money_people_system",
    "physical_intellectual_limitations",
)
SOCIAL_FIELDS = (
    "ig_url",
    "tiktok_url",
    "x_url",
    "linkedin_url",
    "reddit_url",
    "yt_url",
    "fb_url",
    "snapchat_url",
)


def _clamp(value: float, lo: float = 0, hi: float = 100) -> int:
    return int(max(lo, min(hi, round(value))))


def _round1(n: float) -> float:
    return round(n * 10) / 10


def _is_filled(value: Any) -> bool:
    return isinstance(value, str) and len(value.strip()) > 0


@dataclass
class CredibilityResult:
    total: int
    breakdown: dict[str, dict[str, Any]]


def user_to_credibility_input(user: User) -> dict[str, Any]:
    return {
        "name": user.display_name,
        "username": user.username,
        "phone": user.phone,
        "dob": user.dob,
        "city": user.city,
        "country": user.country,
        "occupation_role": user.occupation_role,
        "network_size": user.network_size,
        "education": user.education,
        "specialized_field": user.specialized_field,
        "manages_money_people_system": user.manages_money_people_system,
        "physical_intellectual_limitations": user.physical_intellectual_limitations,
        "ig_url": user.ig_url,
        "tiktok_url": user.tiktok_url,
        "x_url": user.x_url,
        "linkedin_url": user.linkedin_url,
        "reddit_url": user.reddit_url,
        "yt_url": user.yt_url,
        "fb_url": user.fb_url,
        "snapchat_url": user.snapchat_url,
        "photo_url": user.photo_url,
        "bio": user.bio,
        "quote": user.quote,
        "trust_badge": bool(user.trust_badge),
    }


def calc_credibility_from_input(input_data: dict[str, Any]) -> CredibilityResult:
    basic_filled = sum(1 for k in BASIC_FIELDS if _is_filled(input_data.get(k)))
    basic_ratio = basic_filled / len(BASIC_FIELDS)

    q_filled = sum(1 for k in QUESTION_FIELDS if _is_filled(input_data.get(k)))
    q_ratio = q_filled / len(QUESTION_FIELDS)

    social_filled = sum(1 for k in SOCIAL_FIELDS if _is_filled(input_data.get(k)))
    social_ratio = min(1.0, social_filled / SOCIAL_LINKS_GATE)

    extras_filled = sum(
        1
        for k in ("photo_url", "bio", "quote")
        if _is_filled(input_data.get(k))
    )
    extras_ratio = extras_filled / 3

    verif_ratio = 1.0 if input_data.get("trust_badge") else 0.0

    breakdown = {
        "basic_info": {
            "weight": CRED_SECTIONS["basic_info"]["weight"],
            "earned": _round1(CRED_SECTIONS["basic_info"]["weight"] * basic_ratio),
            "ratio": basic_ratio,
            "label": CRED_SECTIONS["basic_info"]["label"],
            "hint": f"{basic_filled}/{len(BASIC_FIELDS)} fields",
        },
        "questions": {
            "weight": CRED_SECTIONS["questions"]["weight"],
            "earned": _round1(CRED_SECTIONS["questions"]["weight"] * q_ratio),
            "ratio": q_ratio,
            "label": CRED_SECTIONS["questions"]["label"],
            "hint": f"{q_filled}/{len(QUESTION_FIELDS)} answered",
        },
        "social_links": {
            "weight": CRED_SECTIONS["social_links"]["weight"],
            "earned": _round1(CRED_SECTIONS["social_links"]["weight"] * social_ratio),
            "ratio": social_ratio,
            "label": CRED_SECTIONS["social_links"]["label"],
            "hint": f"{social_filled}/{SOCIAL_LINKS_GATE} links min",
        },
        "profile_extras": {
            "weight": CRED_SECTIONS["profile_extras"]["weight"],
            "earned": _round1(CRED_SECTIONS["profile_extras"]["weight"] * extras_ratio),
            "ratio": extras_ratio,
            "label": CRED_SECTIONS["profile_extras"]["label"],
            "hint": f"{extras_filled}/3 (photo · about · quote)",
        },
        "verification": {
            "weight": CRED_SECTIONS["verification"]["weight"],
            "earned": CRED_SECTIONS["verification"]["weight"] * verif_ratio,
            "ratio": verif_ratio,
            "label": CRED_SECTIONS["verification"]["label"],
            "hint": (
                "Trust Badge earned"
                if input_data.get("trust_badge")
                else "Trust Badge required"
            ),
        },
    }

    total = round(sum(section["earned"] for section in breakdown.values()))
    return CredibilityResult(total=total, breakdown=breakdown)


def calc_credibility(user: User) -> CredibilityResult:
    return calc_credibility_from_input(user_to_credibility_input(user))


def calc_profile_credibility(
    base_credibility: int = 80,
    trust_badge_bonus: int = 0,
    opposed_posts: int = 0,
    dispute_losses: int = 0,
    ai_flagged_posts: int = 0,
) -> dict[str, int | float]:
    total_credibility = _clamp(base_credibility + trust_badge_bonus)
    updated_credibility = _clamp(
        total_credibility
        - opposed_posts
        - dispute_losses * 2.5
        - ai_flagged_posts * 5
    )
    return {
        "base_credibility": base_credibility,
        "trust_badge_bonus": trust_badge_bonus,
        "total_credibility": total_credibility,
        "opposed_posts": opposed_posts,
        "dispute_losses": dispute_losses,
        "ai_flagged_posts": ai_flagged_posts,
        "updated_credibility": updated_credibility,
    }


def base_credibility_for_user(user: User) -> int:
    return min(calc_credibility(user).total, 80)


async def get_website_account(
    db: AsyncSession, user_id: UUID
) -> Account | None:
    result = await db.execute(
        select(Account)
        .where(
            Account.owner_user_id == user_id,
            Account.platform == "website",
        )
        .limit(1)
    )
    return result.scalar_one_or_none()


def profile_credibility_for_user(
    user: User,
    opposed_posts: int = 0,
) -> int:
    result = calc_profile_credibility(
        base_credibility=base_credibility_for_user(user),
        trust_badge_bonus=20 if user.trust_badge else 0,
        opposed_posts=opposed_posts,
        dispute_losses=0,
        ai_flagged_posts=0,
    )
    return int(result["updated_credibility"])


def profile_credibility_for_account(
    account: Account,
    owner: User | None,
) -> int:
    base = base_credibility_for_user(owner) if owner else 80
    result = calc_profile_credibility(
        base_credibility=base,
        trust_badge_bonus=20 if owner and owner.trust_badge else 0,
        opposed_posts=account.opposed_posts or 0,
        dispute_losses=0,
        ai_flagged_posts=0,
    )
    return int(result["updated_credibility"])
