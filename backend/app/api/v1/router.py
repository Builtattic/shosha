from fastapi import APIRouter

from app.api.v1 import accounts, auth, feed, notifications, reports, users

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(feed.router, prefix="/feed", tags=["feed"])
api_router.include_router(
    notifications.router, prefix="/notifications", tags=["notifications"]
)
