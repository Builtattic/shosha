from __future__ import annotations

from fastapi import Request
from upstash_ratelimit import Ratelimit, SlidingWindow
from upstash_redis import Redis

from app.core.config import get_settings

_ratelimit: Ratelimit | None = None


def _make_limiter(
    max_requests: int,
    window: int,
    unit: str,
    *,
    prefix: str = "@upstash/ratelimit",
) -> Ratelimit | None:
    settings = get_settings()
    if not settings.UPSTASH_REDIS_REST_URL or not settings.UPSTASH_REDIS_REST_TOKEN:
        return None
    redis = Redis(
        url=settings.UPSTASH_REDIS_REST_URL,
        token=settings.UPSTASH_REDIS_REST_TOKEN,
    )
    return Ratelimit(
        redis=redis,
        limiter=SlidingWindow(max_requests=max_requests, window=window, unit=unit),
        prefix=prefix,
    )


def client_ip_from_request(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    if request.client:
        return request.client.host
    return "unknown"


def get_ratelimiter() -> Ratelimit | None:
    """
    Returns configured Ratelimit instance or None if Upstash not configured.
    When None, rate limiting is skipped silently (dev/local mode).
    """
    global _ratelimit
    if _ratelimit is not None:
        return _ratelimit
    settings = get_settings()
    if not settings.UPSTASH_REDIS_REST_URL or not settings.UPSTASH_REDIS_REST_TOKEN:
        return None
    redis = Redis(
        url=settings.UPSTASH_REDIS_REST_URL,
        token=settings.UPSTASH_REDIS_REST_TOKEN,
    )
    _ratelimit = Ratelimit(
        redis=redis, limiter=SlidingWindow(max_requests=10, window=1, unit="h")
    )
    return _ratelimit


def get_report_limiter() -> Ratelimit | None:
    """10 reports per hour per user"""
    return _make_limiter(10, 1, "h")


def get_upload_limiter() -> Ratelimit | None:
    """20 uploads per hour per user"""
    return _make_limiter(20, 1, "h")


def get_auth_limiter() -> Ratelimit | None:
    """20 auth attempts per hour per IP"""
    return _make_limiter(20, 1, "h")


def get_ai_analyze_limiter() -> Ratelimit | None:
    """30 AI analyze requests per hour per user (V1 parity)"""
    return _make_limiter(30, 1, "h")


def get_ai_classify_limiter() -> Ratelimit | None:
    """20 AI classify requests per hour per user (V1 parity)"""
    return _make_limiter(20, 1, "h")


def get_account_search_limiter() -> Ratelimit | None:
    """60 account searches per minute per IP (V1 parity)"""
    return _make_limiter(60, 1, "m")


def get_claims_limiter() -> Ratelimit | None:
    """3 claim submissions per day per user (V1 parity)"""
    return _make_limiter(3, 1, "d")


def get_events_limiter() -> Ratelimit | None:
    """10 event posts per hour per user (V1 parity)"""
    return _make_limiter(10, 1, "h", prefix="rl:events")


async def check_rate_limit(identifier: str, limit_override: Ratelimit | None = None) -> None:
    """
    Check rate limit for identifier. Raises 429 if exceeded.
    Silently passes if Upstash not configured.
    identifier: use f"report:{user_id}" or f"upload:{user_id}"
    """
    limiter = limit_override or get_ratelimiter()
    if limiter is None:
        return
    response = limiter.limit(identifier)
    if not response.allowed:
        from app.core.exceptions import raise_api_error

        raise_api_error("rate_limited", "Too many requests. Please try again later.")
