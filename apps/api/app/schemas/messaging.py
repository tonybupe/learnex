from datetime import datetime
from pydantic import BaseModel, Field


class ConversationCreate(BaseModel):
    recipient_user_id: int | None = None
    title: str | None = Field(default=None, max_length=255)


class ConversationResponse(BaseModel):
    id: int
    conversation_type: str
    title: str | None
    class_id: int | None
    lesson_id: int | None
    created_by_id: int | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationParticipantResponse(BaseModel):
    id: int
    conversation_id: int
    user_id: int
    role: str
    is_muted: bool
    last_read_message_id: int | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1)
    message_type: str = Field(default="text", pattern="^(text|system|file|image|video)$")
    media_file_id: int | None = None


class MessageUpdate(BaseModel):
    content: str = Field(..., min_length=1)


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    content: str
    message_type: str
    media_file_id: int | None
    is_edited: bool
    is_deleted: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MessageActionResponse(BaseModel):
    message: str


class UnreadCounterResponse(BaseModel):
    conversation_id: int
    unread_count: int


class TotalUnreadResponse(BaseModel):
    total_unread_count: int