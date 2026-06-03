from __future__ import annotations

from app.repositories.user_repository import (
    create as create_user,
    get_by_firebase_uid,
    get_by_id as get_user_by_id,
    get_by_username,
    update as update_user,
    update_last_login,
)
from app.repositories.account_repository import (
    create as create_account,
    get_by_id as get_account_by_id,
    get_by_platform_handle,
    get_social_links,
    list_accounts,
    search as search_accounts,
    update as update_account,
    upsert_social_link,
)
from app.repositories.report_repository import (
    add_comment,
    add_media,
    create as create_report,
    get_by_id as get_report_by_id,
    list_comments,
    list_moderation_queue,
    list_reports,
    update_status,
    upsert_vote,
)

__all__ = [
    "get_user_by_id",
    "get_by_firebase_uid",
    "get_by_username",
    "create_user",
    "update_user",
    "update_last_login",
    "get_account_by_id",
    "get_by_platform_handle",
    "list_accounts",
    "search_accounts",
    "create_account",
    "update_account",
    "get_social_links",
    "upsert_social_link",
    "get_report_by_id",
    "list_reports",
    "list_moderation_queue",
    "create_report",
    "add_media",
    "upsert_vote",
    "add_comment",
    "list_comments",
    "update_status",
]
