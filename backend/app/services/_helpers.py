from __future__ import annotations

import re

from app.core.exceptions import raise_api_error
from app.models.enums import UserRole
from app.models.user import User

_MODERATOR_PLUS = frozenset({UserRole.MODERATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN})
_ADMIN_ONLY = frozenset({UserRole.ADMIN, UserRole.SUPER_ADMIN})

VALID_PLATFORMS = frozenset({
    "x",
    "instagram",
    "facebook",
    "youtube",
    "tiktok",
    "linkedin",
    "reddit",
    "snapchat",
    "website",
})

_USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9._]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$")
_CONSECUTIVE_SPECIAL = re.compile(r"([._]){2,}")
_ADJACENT_SPECIAL = re.compile(r"(\.\_|\_\.)")


def is_moderator_plus(user: User | None) -> bool:
    if user is None:
        return False
    return user.role in _MODERATOR_PLUS


def is_admin(user: User | None) -> bool:
    if user is None:
        return False
    return user.role in _ADMIN_ONLY


def normalize_username(raw: str) -> str:
    return raw.lstrip("@").strip().lower()


def validate_username_format(username: str) -> None:
    if len(username) < 3:
        raise_api_error("validation_error", "Username must be at least 3 characters")
    if len(username) > 64:
        raise_api_error("validation_error", "Username must be at most 64 characters")
    if not _USERNAME_PATTERN.match(username):
        raise_api_error(
            "validation_error",
            "Username can only contain letters, numbers, underscores, and periods",
        )
    if _CONSECUTIVE_SPECIAL.search(username) or _ADJACENT_SPECIAL.search(username):
        raise_api_error("validation_error", "Username cannot have consecutive special characters")


def normalize_handle(raw: str) -> str:
    value = raw.lstrip("@").strip().lower()
    value = re.sub(r"https?://", "", value)
    value = re.sub(r"[^a-z0-9_.-]+", "-", value)
    value = re.sub(r"-+", "-", value)
    value = value.strip("-")
    if len(value) < 2:
        raise_api_error("validation_error", "Handle must contain at least 2 safe characters")
    return value


def validate_platform(platform: str) -> None:
    if platform not in VALID_PLATFORMS:
        raise_api_error("validation_error", f"Invalid platform: {platform}")


def validate_search_query(q: str) -> str:
    trimmed = q.strip()
    if len(trimmed) < 2:
        raise_api_error("validation_error", "Search query must be at least 2 characters")
    if len(trimmed) > 100:
        raise_api_error("validation_error", "Search query must be at most 100 characters")
    return trimmed
