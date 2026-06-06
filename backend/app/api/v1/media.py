from __future__ import annotations

import asyncio
import logging
from io import BytesIO
from typing import Literal

from fastapi import APIRouter, Depends, File, UploadFile
from PIL import Image
from pydantic import BaseModel

from app.core.dependencies import get_current_user
from app.core.ratelimit import check_rate_limit, get_upload_limiter
from app.core.responses import error, success
from app.integrations.s3 import (
    _is_aws_configured,
    generate_upload_path,
    upload_file,
)
from app.models.user import User
from app.schemas.common import SuccessEnvelope

logger = logging.getLogger(__name__)

router = APIRouter()

MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_VIDEO_BYTES = 50 * 1024 * 1024

IMAGE_CONTENT_TYPES = frozenset(
    {"image/jpeg", "image/png", "image/webp", "image/gif"}
)
VIDEO_CONTENT_TYPES = frozenset(
    {"video/mp4", "video/quicktime", "video/webm"}
)

VIDEO_EXT_BY_CONTENT_TYPE = {
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
}


class MediaUploadData(BaseModel):
    url: str
    thumbnail_url: str | None
    media_type: Literal["image", "video"]
    size_bytes: int


def _process_image(file_bytes: bytes) -> tuple[bytes, bytes]:
    image = Image.open(BytesIO(file_bytes))
    if image.mode not in ("RGB", "RGBA"):
        image = image.convert("RGB")

    main_buffer = BytesIO()
    image.save(main_buffer, format="WEBP", quality=82)
    main_bytes = main_buffer.getvalue()

    thumb_image = image.copy()
    thumb_image.thumbnail((300, 300))
    thumb_buffer = BytesIO()
    thumb_image.save(thumb_buffer, format="WEBP", quality=60)
    thumb_bytes = thumb_buffer.getvalue()

    return main_bytes, thumb_bytes


@router.post(
    "/upload",
    response_model=SuccessEnvelope[MediaUploadData],
    summary="Upload image or video media",
)
async def post_media_upload(
    file: UploadFile | None = File(default=None),
    current_user: User = Depends(get_current_user),
):
    await check_rate_limit(f"upload:{current_user.id}", get_upload_limiter())
    if not _is_aws_configured():
        return error("service_unavailable", "Media upload not configured", 503)

    if file is None or not file.filename:
        return error("validation_error", "A file is required.", 400)

    content_type = file.content_type or "application/octet-stream"
    is_image = content_type in IMAGE_CONTENT_TYPES
    is_video = content_type in VIDEO_CONTENT_TYPES

    if not is_image and not is_video:
        return error(
            "validation_error",
            "Only image or video uploads are accepted.",
            415,
        )

    file_bytes = await file.read()
    max_bytes = MAX_VIDEO_BYTES if is_video else MAX_IMAGE_BYTES
    if len(file_bytes) > max_bytes:
        return error(
            "payload_too_large",
            f"File exceeds {max_bytes} bytes.",
            413,
        )

    actor_id = str(current_user.id)

    try:
        if is_image:
            loop = asyncio.get_event_loop()
            main_bytes, thumb_bytes = await loop.run_in_executor(
                None, _process_image, file_bytes
            )
            folder, filename = generate_upload_path(actor_id, "image", "webp")
            thumb_filename = filename.replace(".webp", "_thumb.webp")

            main_url, thumb_url = await asyncio.gather(
                upload_file(main_bytes, "image/webp", folder, filename),
                upload_file(thumb_bytes, "image/webp", folder, thumb_filename),
            )

            return success(
                {
                    "url": main_url,
                    "thumbnail_url": thumb_url,
                    "media_type": "image",
                    "size_bytes": len(main_bytes),
                }
            )

        ext = VIDEO_EXT_BY_CONTENT_TYPE[content_type]
        folder, filename = generate_upload_path(actor_id, "video", ext)
        main_url = await upload_file(file_bytes, content_type, folder, filename)

        return success(
            {
                "url": main_url,
                "thumbnail_url": None,
                "media_type": "video",
                "size_bytes": len(file_bytes),
            }
        )
    except ValueError:
        return error("service_unavailable", "Media upload not configured", 503)
    except Exception as exc:
        logger.exception("Media upload failed: %s", exc)
        return error("upload_failed", "Media upload failed.", 500)
