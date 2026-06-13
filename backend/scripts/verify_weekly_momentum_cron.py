"""Verify weekly-momentum cron auth + run (Day 8 parity hardening)."""
from __future__ import annotations

import asyncio
import os

os.environ["CRON_TOKEN"] = "day8-local-cron-verify"

from app.core.config import get_settings

get_settings.cache_clear()

from httpx import ASGITransport, AsyncClient

from app.main import app


async def main() -> None:
    token = get_settings().CRON_TOKEN or os.environ["CRON_TOKEN"]
    headers = {"Authorization": f"Bearer {token}"}
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        post = await client.post("/api/v1/cron/weekly-momentum", headers=headers)
        print("POST", post.status_code, post.text)
        assert post.status_code == 200, post.text

        get = await client.get("/api/v1/cron/weekly-momentum", headers=headers)
        print("GET", get.status_code, get.text)
        assert get.status_code == 200, get.text

        accounts = await client.get("/api/v1/accounts")
        if accounts.status_code == 200:
            data = accounts.json()
            items = data.get("data") or data.get("items") or []
            if isinstance(items, list) and items:
                sample = items[0]
                print("sample weekly_delta:", sample.get("weekly_delta"))


if __name__ == "__main__":
    asyncio.run(main())
