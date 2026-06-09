from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import raise_api_error
from app.repositories import import_repository as repo


async def create_import(
    db: AsyncSession,
    user_id: UUID,
    import_type: str,
    items: list,
) -> dict:
    if import_type not in ("contacts", "links"):
        raise_api_error("validation_error", "import_type must be contacts or links")
    if not items:
        raise_api_error("validation_error", "No items to import")
    if len(items) > 400:
        raise_api_error("validation_error", "Maximum 400 items per import")

    await repo.create(
        db,
        user_id=user_id,
        import_type=import_type,
        payload=items,
        item_count=len(items),
    )
    await db.commit()
    return {"message": "Import queued", "count": len(items)}
