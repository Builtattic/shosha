from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.enums import AccountStatus, SwipeDirection


class TrendingAccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    platform: str
    handle: str
    display_name: str | None
    score: float
    owner_user_id: UUID | None


class DeckAccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    platform: str
    handle: str
    display_name: str | None
    bio: str | None
    score: float
    owner_user_id: UUID | None
    status: AccountStatus
    week_delta: float | None = None


class SwipeRequest(BaseModel):
    direction: SwipeDirection


class SwipeResponse(BaseModel):
    account_id: UUID
    direction: SwipeDirection
    delta: float
    new_account_score: float


class TrendingResponse(BaseModel):
    items: list[TrendingAccountOut]


class DeckResponse(BaseModel):
    items: list[DeckAccountOut]
    next_cursor: int
    has_more: bool
