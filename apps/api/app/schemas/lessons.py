from datetime import datetime
from pydantic import BaseModel, Field


class LessonCreate(BaseModel):
    class_id: int
    subject_id: int
    title: str = Field(..., min_length=2, max_length=200)
    description: str | None = None
    content: str = Field(..., min_length=1)
    lesson_type: str = Field(default="note", pattern="^(note|video|live|assignment)$")
    visibility: str = Field(default="class", pattern="^(class|public)$")
    status: str = Field(default="published", pattern="^(draft|published|archived)$")


class LessonUpdate(BaseModel):
    class_id: int | None = None
    subject_id: int | None = None
    title: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = None
    content: str | None = Field(default=None, min_length=1)
    lesson_type: str | None = Field(default=None, pattern="^(note|video|live|assignment)$")
    visibility: str | None = Field(default=None, pattern="^(class|public)$")
    status: str | None = Field(default=None, pattern="^(draft|published|archived)$")


class LessonResourceCreate(BaseModel):
    media_file_id: int | None = None
    resource_type: str = Field(..., pattern="^(file|image|video|link)$")
    url: str
    title: str | None = None
    mime_type: str | None = None


class LessonResourceResponse(BaseModel):
    id: int
    media_file_id: int | None
    resource_type: str
    url: str
    title: str | None
    mime_type: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LessonResponse(BaseModel):
    id: int
    class_id: int
    subject_id: int
    teacher_id: int
    title: str
    description: str | None
    content: str
    lesson_type: str
    visibility: str
    status: str
    resources: list[LessonResourceResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}