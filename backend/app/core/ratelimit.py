from __future__ import annotations

from upstash_ratelimit import Ratelimit, SlidingWindow
from upstash_redis import Redis

from app.core.config import get_settings

_ratelimit: Ratelimit | None = None


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
    settings = get_settings()
    if not settings.UPSTASH_REDIS_REST_URL or not settings.UPSTASH_REDIS_REST_TOKEN:
        return None
    redis = Redis(
        url=settings.UPSTASH_REDIS_REST_URL,
        token=settings.UPSTASH_REDIS_REST_TOKEN,
    )
    return Ratelimit(
        redis=redis, limiter=SlidingWindow(max_requests=10, window=1, unit="h")
    )


def get_upload_limiter() -> Ratelimit | None:
    """20 uploads per hour per user"""
    settings = get_settings()
    if not settings.UPSTASH_REDIS_REST_URL or not settings.UPSTASH_REDIS_REST_TOKEN:
        return None
    redis = Redis(
        url=settings.UPSTASH_REDIS_REST_URL,
        token=settings.UPSTASH_REDIS_REST_TOKEN,
    )
    return Ratelimit(
        redis=redis, limiter=SlidingWindow(max_requests=20, window=1, unit="h")
    )


def get_auth_limiter() -> Ratelimit | None:
    """20 auth attempts per hour per IP"""
    settings = get_settings()
    if not settings.UPSTASH_REDIS_REST_URL or not settings.UPSTASH_REDIS_REST_TOKEN:
        return None
    redis = Redis(
        url=settings.UPSTASH_REDIS_REST_URL,
        token=settings.UPSTASH_REDIS_REST_TOKEN,
    )
    return Ratelimit(
        redis=redis, limiter=SlidingWindow(max_requests=20, window=1, unit="h")
    )


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
