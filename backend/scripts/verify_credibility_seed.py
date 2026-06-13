"""One-off: mirror GET /users/me credibility fields for seed users (no Firebase token)."""
from __future__ import annotations

import asyncio
import json

from sqlalchemy import select

from app.core.database import async_session_maker
from app.models.user import User
from app.repositories import account_repository, user_repository
from app.services.credibility_service import (
    calc_credibility,
    profile_credibility_for_account,
    profile_credibility_for_user,
    get_website_account,
)


async def user_me_payload(db, user: User) -> dict:
    website_account = await get_website_account(db, user.id)
    opposed_posts = website_account.opposed_posts if website_account else 0
    cred = calc_credibility(user)
    return {
        "username": user.username,
        "email": user.email,
        "onboarding_complete": user.onboarding_complete,
        "trust_badge": bool(user.trust_badge),
        "credibility_stored": user.credibility,
        "credibility_computed": cred.total,
        "profile_credibility": profile_credibility_for_user(user, opposed_posts=opposed_posts),
        "opposed_posts": opposed_posts,
    }


async def account_payload(db, user: User) -> dict | None:
    accounts = await account_repository.list_by_owner(db, user.id, limit=5)
    if not accounts:
        return None
    account = next((a for a in accounts if a.platform == "website"), accounts[0])
    owner = await user_repository.get_by_id(db, account.owner_user_id) if account.owner_user_id else None
    return {
        "account_id": str(account.id),
        "handle": account.handle,
        "platform": account.platform,
        "profile_credibility": profile_credibility_for_account(account, owner),
    }


async def main() -> None:
    usernames = ["seed_admin", "seed_full1", "seed_incomplete1"]
    results = []
    async with async_session_maker() as db:
        for username in usernames:
            row = await db.execute(select(User).where(User.username == username))
            user = row.scalar_one_or_none()
            if user is None:
                results.append({"username": username, "error": "not found"})
                continue
            entry = await user_me_payload(db, user)
            entry["account"] = await account_payload(db, user)
            results.append(entry)
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
