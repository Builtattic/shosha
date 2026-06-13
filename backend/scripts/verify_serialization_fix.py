"""Verify MissingGreenlet fix on 5 affected endpoints."""
from __future__ import annotations

import asyncio
import json
import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

import firebase_admin
from firebase_admin import auth, credentials
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app

ENV = ROOT / ".env"
KNOWN_ACCOUNT = "2b551263-8397-46be-9184-a3af8d593114"


def load_env(name: str) -> str | None:
    for line in ENV.read_text(encoding="utf-8").splitlines():
        if line.startswith(f"{name}="):
            return line.split("=", 1)[1].strip().strip('"')
    return None


def init_firebase() -> None:
    if firebase_admin._apps:
        return
    firebase_admin.initialize_app(
        credentials.Certificate(json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON))
    )


async def token(uid: str) -> str:
    import httpx

    custom = auth.create_custom_token(uid).decode()
    api_key = load_env("NEXT_PUBLIC_FIREBASE_API_KEY")
    r = httpx.post(
        f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key={api_key}",
        json={"token": custom, "returnSecureToken": True},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()["idToken"]


async def main() -> None:
    init_firebase()
    t_user = await token("seed-uid-002")
    t_admin = await token("seed-uid-001")
    headers_user = {"Authorization": f"Bearer {t_user}"}
    headers_admin = {"Authorization": f"Bearer {t_admin}"}

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(
        transport=transport, base_url="http://test", follow_redirects=True
    ) as client:
        # 1 GET accounts list
        r1 = await client.get(
            "/api/v1/accounts/", params={"limit": 2}, headers=headers_user
        )
        d1 = r1.json()
        sl = (
            d1.get("data", {}).get("items", [{}])[0].get("social_links")
            if d1.get("ok")
            else None
        )
        print(f"1 GET /accounts/ -> {r1.status_code} social_links_key={sl is not None}")

        # 2 GET reports list
        r2 = await client.get(
            "/api/v1/reports/", params={"limit": 2}, headers=headers_user
        )
        d2 = r2.json()
        item = (d2.get("data", {}) or {}).get("items", [{}])[0] if d2.get("ok") else {}
        print(
            f"2 GET /reports/ -> {r2.status_code} "
            f"has_account={item.get('account') is not None} "
            f"has_media={item.get('media_items') is not None}"
        )

        # 3 GET moderation queue
        r3 = await client.get(
            "/api/v1/reports/moderation-queue",
            params={"status": "PENDING", "limit": 2},
            headers=headers_admin,
        )
        d3 = r3.json()
        mq = (d3.get("data", {}) or {}).get("items", [])
        print(f"3 GET moderation-queue -> {r3.status_code} items={len(mq)}")

        # 4 POST create report
        title = f"FixVerify{uuid.uuid4().hex[:6]}"
        r4 = await client.post(
            "/api/v1/reports/",
            json={
                "account_id": KNOWN_ACCOUNT,
                "title": title,
                "description": "MissingGreenlet fix verification report.",
                "type": "positive",
                "is_irl": False,
                "evidence_source_url": "https://example.com/evidence",
                "media": [
                    {"url": "https://picsum.photos/200", "media_type": "image"}
                ],
            },
            headers=headers_user,
        )
        d4 = r4.json()
        rep = (d4.get("data") or {}).get("report") or {}
        print(
            f"4 POST /reports/ -> {r4.status_code} "
            f"account={rep.get('account') is not None} "
            f"media={len(rep.get('media_items') or [])}"
        )
        pending_id = rep.get("id")

        # 5 POST moderate
        if not pending_id and mq:
            pending_id = mq[0].get("id")
        if pending_id:
            before = (
                await client.get(
                    f"/api/v1/accounts/{KNOWN_ACCOUNT}", headers=headers_admin
                )
            ).json()["data"]["account"]["score"]
            r5 = await client.post(
                f"/api/v1/reports/{pending_id}/moderate",
                json={
                    "decision": "APPROVED",
                    "deed": "Verify deed",
                    "base_score": -45.0,
                    "intent": 2.0,
                    "circumstances": 1.5,
                    "repetition_pattern": 1.0,
                },
                headers=headers_admin,
            )
            after = (
                await client.get(
                    f"/api/v1/accounts/{KNOWN_ACCOUNT}", headers=headers_admin
                )
            ).json()["data"]["account"]["score"]
            d5 = r5.json()
            mod_rep = (d5.get("data") or {}).get("report") or {}
            print(
                f"5 POST moderate -> {r5.status_code} "
                f"account={mod_rep.get('account') is not None} "
                f"score {before} -> {after}"
            )
        else:
            print("5 POST moderate -> SKIPPED no pending report")

    ok = all(
        x in ("200",)
        for x in [
            str(r1.status_code),
            str(r2.status_code),
            str(r3.status_code),
            str(r4.status_code),
        ]
    )
    print(f"\nALL_LIST_CREATE_OK={ok}")


if __name__ == "__main__":
    asyncio.run(main())
