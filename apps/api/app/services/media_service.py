import hashlib
import os
import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.media_file import MediaFile
from app.models.user import User


IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
AUDIO_TYPES = {"audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg"}
DOCUMENT_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
}
ARCHIVE_TYPES = {
    "application/zip",
    "application/x-zip-compressed",
    "application/x-rar-compressed",
}


def detect_media_type(mime_type: str) -> str:
    if mime_type in IMAGE_TYPES:
        return "image"
    if mime_type in VIDEO_TYPES:
        return "video"
    if mime_type in AUDIO_TYPES:
        return "audio"
    if mime_type in DOCUMENT_TYPES:
        return "document"
    if mime_type in ARCHIVE_TYPES:
        return "archive"
    return "other"


def build_storage_path(owner_id: int, extension: str | None) -> tuple[str, str]:
    unique_name = str(uuid.uuid4())
    ext = extension or ""
    object_key = f"user_{owner_id}/{unique_name}{ext}"
    absolute_path = str(Path(settings.upload_dir) / object_key)
    Path(absolute_path).parent.mkdir(parents=True, exist_ok=True)
    return object_key, absolute_path


def save_upload_file(upload: UploadFile, owner: User) -> tuple[bytes, str, str | None]:
    content = upload.file.read()
    upload.file.seek(0)

    max_size = settings.max_upload_size_mb * 1024 * 1024
    if len(content) > max_size:
        raise ValueError(f"File exceeds maximum size of {settings.max_upload_size_mb}MB")

    checksum = hashlib.sha256(content).hexdigest()

    original_name = upload.filename or "file"
    extension = Path(original_name).suffix.lower() or None

    object_key, absolute_path = build_storage_path(owner.id, extension)
    with open(absolute_path, "wb") as f:
        f.write(content)

    return content, object_key, checksum


def create_media_record(
    db: Session,
    *,
    owner: User,
    upload: UploadFile,
    visibility: str = "private",
    entity_type: str | None = None,
    entity_id: int | None = None,
) -> MediaFile:
    if not upload.filename:
        raise ValueError("Uploaded file must have a filename")

    mime_type = upload.content_type or "application/octet-stream"
    media_type = detect_media_type(mime_type)

    content, object_key, checksum = save_upload_file(upload, owner)

    file_name = Path(upload.filename).name
    extension = Path(file_name).suffix.lower() or None
    relative_path = object_key
    public_url = f"{settings.media_base_url}/{object_key}"

    record = MediaFile(
        owner_id=owner.id,
        storage_provider="local",
        bucket_name=None,
        object_key=object_key,
        original_name=upload.filename,
        file_name=file_name,
        file_extension=extension,
        mime_type=mime_type,
        media_type=media_type,
        file_size_bytes=len(content),
        checksum_sha256=checksum,
        public_url=public_url,
        relative_path=relative_path,
        visibility=visibility,
        entity_type=entity_type,
        entity_id=entity_id,
        is_active=True,
        is_deleted=False,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def update_media_record(db: Session, media: MediaFile, visibility: str | None, entity_type: str | None, entity_id: int | None) -> MediaFile:
    if visibility is not None:
        media.visibility = visibility
    media.entity_type = entity_type
    media.entity_id = entity_id
    db.commit()
    db.refresh(media)
    return media


def soft_delete_media(db: Session, media: MediaFile) -> MediaFile:
    media.is_active = False
    media.is_deleted = True
    db.commit()
    db.refresh(media)
    return media


def hard_delete_media_file(media: MediaFile) -> None:
    if media.relative_path:
        absolute_path = Path(settings.upload_dir) / media.relative_path
        if absolute_path.exists():
            os.remove(absolute_path)