from datetime import datetime
from pydantic import BaseModel, Field


class MediaFileResponse(BaseModel):
    id: int
    owner_id: int
    storage_provider: str
    bucket_name: str | None
    object_key: str
    original_name: str
    file_name: str
    file_extension: str | None
    mime_type: str
    media_type: str
    file_size_bytes: int
    checksum_sha256: str | None
    public_url: str | None
    relative_path: str | None
    visibility: str
    entity_type: str | None
    entity_id: int | None
    is_active: bool
    is_deleted: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MediaFileUpdate(BaseModel):
    visibility: str | None = Field(default=None, pattern="^(private|class|public)$")
    entity_type: str | None = Field(default=None, max_length=50)
    entity_id: int | None = None


class MediaActionResponse(BaseModel):
    message: str