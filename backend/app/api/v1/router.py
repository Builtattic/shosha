from fastapi import APIRouter

from app.api.v1 import (
    accounts,
    admin,
    ai,
    auth,
    bubbles,
    claims,
    discovery,
    disputes,
    events,
    feed,
    impact,
    imports,
    me,
    media,
    misc,
    notifications,
    people,
    reports,
    social,
    users,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(social.router, tags=["social"])
api_router.include_router(me.router, tags=["me"])
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
api_router.include_router(discovery.router, tags=["discovery"])
api_router.include_router(impact.router, tags=["impact"])
api_router.include_router(events.router, tags=["events"])
api_router.include_router(misc.router, tags=["misc"])
api_router.include_router(imports.router, tags=["imports"])
api_router.include_router(ai.router, tags=["ai"])
