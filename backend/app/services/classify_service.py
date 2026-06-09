from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.gemini import classify_description


async def classify_report(
    db: AsyncSession,
    description: str,
    gemini_api_key: str | None = None,
) -> dict:
    del db
    return await classify_description(description, api_key=gemini_api_key)
