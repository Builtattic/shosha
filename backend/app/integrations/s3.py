from __future__ import annotations

import asyncio
import logging
from uuid import uuid4

import boto3

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_client = None


def _is_aws_configured() -> bool:
    settings = get_settings()
    return bool(
        settings.AWS_ACCESS_KEY_ID
        and settings.AWS_SECRET_ACCESS_KEY
        and settings.AWS_S3_BUCKET
    )


def get_s3_client():
    global _client
    if _client is not None:
        return _client

    settings = get_settings()
    if not _is_aws_configured():
        raise ValueError("AWS S3 is not configured")

    _client = boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )
    return _client


def generate_upload_path(actor_id: str, media_type: str, ext: str) -> tuple[str, str]:
    folder = f"uploads/{actor_id}/{media_type}"
    filename = f"{uuid4()}.{ext}"
    return folder, filename


async def upload_file(
    file_bytes: bytes,
    content_type: str,
    folder: str,
    filename: str,
) -> str:
    if not _is_aws_configured():
        raise ValueError("AWS S3 is not configured")

    settings = get_settings()
    client = get_s3_client()
    key = f"{folder}/{filename}"

    def _put_object() -> None:
        client.put_object(
            Bucket=settings.AWS_S3_BUCKET,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
            ACL="public-read",
        )

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _put_object)

    bucket = settings.AWS_S3_BUCKET
    region = settings.AWS_REGION
    return f"https://{bucket}.s3.{region}.amazonaws.com/{key}"
