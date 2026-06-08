from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories import site_setting_repository as repo

_SETTINGS_KEY = "current"

# Ported from V1: Shoshaaahhh/src/lib/repos/siteSettings.ts (DEFAULT_SITE_SETTINGS).
DEFAULT_SITE_SETTINGS: dict = {
    "allowAiReviewedInFeed": False,
    "allowFlaggedInFeed": False,
    "feedRankingMode": "smart",
    "enabledPlatforms": [
        "x",
        "instagram",
        "facebook",
        "youtube",
        "tiktok",
        "linkedin",
        "reddit",
        "snapchat",
        "website",
    ],
    "scoreImpactMin": -10,
    "scoreImpactMax": 10,
    "uploadMaxBytes": 25 * 1024 * 1024,
    "liveFeedEnabled": False,
    "disputeThreshold": 3,
    "duplicateThreshold": 0.86,
    "singleReportDeltaCap": 3000,
    "dailyProfileDeltaCap": 5000,
    "reportCooldownHours": 24,
}


async def get_settings(db: AsyncSession) -> dict:
    setting = await repo.get_by_key(db, _SETTINGS_KEY)
    stored = setting.value if setting is not None else {}
    merged = {**DEFAULT_SITE_SETTINGS, **stored}
    enabled = stored.get("enabledPlatforms")
    if not isinstance(enabled, list):
        merged["enabledPlatforms"] = DEFAULT_SITE_SETTINGS["enabledPlatforms"]
    return merged


async def update_settings(db: AsyncSession, partial_update: dict) -> dict:
    current = await get_settings(db)
    merged = {**current, **partial_update}
    await repo.upsert_by_key(db, _SETTINGS_KEY, merged)
    await db.commit()
    return merged
