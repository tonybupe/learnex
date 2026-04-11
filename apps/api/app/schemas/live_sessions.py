from datetime import datetime
from pydantic import BaseModel, Field


class LiveSessionCreate(BaseModel):
    class_id: int
    subject_id: int
    lesson_id: int | None = None
    title: str = Field(..., min_length=2, max_length=200)
    description: str | None = None
    session_type: str = Field(default="live", pattern="^(live|revision|discussion|oral)$")
    meeting_provider: str | None = Field(default="internal", max_length=50)
    meeting_url: str | None = None
    meeting_code: str | None = Field(default=None, max_length=100)
    scheduled_start_at: datetime
    scheduled_end_at: datetime
    allow_replay: bool = False
    recording_url: str | None = None


class LiveSessionUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = None
    session_type: str | None = Field(default=None, pattern="^(live|revision|discussion|oral)$")
    status: str | None = Field(default=None, pattern="^(scheduled|live|completed|cancelled)$")
    meeting_provider: str | None = Field(default=None, max_length=50)
    meeting_url: str | None = None
    meeting_code: str | None = Field(default=None, max_length=100)
    scheduled_start_at: datetime | None = None
    scheduled_end_at: datetime | None = None
    allow_replay: bool | None = None
    recording_url: str | None = None


class SessionAttendanceResponse(BaseModel):
    id: int
    session_id: int
    user_id: int
    role_at_join: str
    attendance_status: str
    joined_at: datetime
    left_at: datetime | None
    duration_seconds: int | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LiveSessionResponse(BaseModel):
    id: int
    class_id: int
    subject_id: int
    teacher_id: int
    lesson_id: int | None
    title: str
    description: str | None
    session_type: str
    status: str
    meeting_provider: str | None
    meeting_url: str | None
    meeting_code: str | None
    scheduled_start_at: datetime
    scheduled_end_at: datetime
    actual_start_at: datetime | None
    actual_end_at: datetime | None
    allow_replay: bool
    recording_url: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LiveSessionActionResponse(BaseModel):
    message: str


class JoinSessionResponse(BaseModel):
    attendance_id: int
    session_id: int
    meeting_url: str | None
    meeting_code: str | None
    message: str