from __future__ import annotations

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.responses import success
from app.models.user import User
from app.services import import_service

router = APIRouter()


class ContactItem(BaseModel):
    name: str
    phone_number: str | None = None
    email: str | None = None


class ImportContactsRequest(BaseModel):
    contacts: list[ContactItem] = Field(..., max_length=400)


class ImportLinksRequest(BaseModel):
    links: list[str] = Field(..., max_length=400)


@router.post("/imports/contacts")
async def post_import_contacts(
    data: ImportContactsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = [c.model_dump(exclude_none=True) for c in data.contacts]
    result = await import_service.create_import(
        db, current_user.id, "contacts", items
    )
    return success(result)


@router.post("/imports/links")
async def post_import_links(
    data: ImportLinksRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await import_service.create_import(
        db, current_user.id, "links", data.links
    )
    return success(result)
