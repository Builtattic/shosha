from fastapi import APIRouter

from app.api.v1 import accounts, admin, auth, bubbles, claims, disputes, feed, media, notifications, people, reports, users

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(feed.router, prefix="/feed", tags=["feed"])
api_router.include_router(people.router, prefix="/people", tags=["people"])
api_router.include_router(
    notifications.router, prefix="/notifications", tags=["notifications"]
)
api_router.include_router(claims.router, prefix="/claims", tags=["claims"])
api_router.include_router(bubbles.router, prefix="/bubbles", tags=["bubbles"])
api_router.include_router(disputes.router, prefix="/disputes", tags=["disputes"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(media.router, prefix="/media", tags=["media"])
