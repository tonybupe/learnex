from datetime import datetime
from pydantic import BaseModel, Field


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    actor_id: int | None
    notification_type: str
    title: str
    message: str
    entity_type: str | None
    entity_id: int | None
    action_url: str | None
    is_read: bool
    is_seen: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NotificationActionResponse(BaseModel):
    message: str


class ReminderCreate(BaseModel):
    user_id: int
    reminder_type: str = Field(..., min_length=2, max_length=50)
    title: str = Field(..., min_length=2, max_length=200)
    message: str = Field(..., min_length=1)
    entity_type: str | None = Field(default=None, max_length=50)
    entity_id: int | None = None
    scheduled_for: datetime


class ReminderResponse(BaseModel):
    id: int
    user_id: int
    created_by_id: int | None
    reminder_type: str
    title: str
    message: str
    entity_type: str | None
    entity_id: int | None
    scheduled_for: datetime
    is_sent: bool
    sent_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}