from datetime import datetime
from pydantic import BaseModel


class SearchUserItem(BaseModel):
    id: int
    full_name: str
    email: str
    phone_number: str
    sex: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SearchSubjectItem(BaseModel):
    id: int
    code: str
    name: str
    description: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class SearchClassItem(BaseModel):
    id: int
    title: str
    description: str | None
    class_code: str
    grade_level: str
    visibility: str
    teacher_id: int
    subject_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class SearchPostItem(BaseModel):
    id: int
    author_id: int
    class_id: int | None
    title: str | None
    content: str
    visibility: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SearchLessonItem(BaseModel):
    id: int
    class_id: int
    subject_id: int
    teacher_id: int
    title: str
    description: str | None
    lesson_type: str
    visibility: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SearchQuizItem(BaseModel):
    id: int
    class_id: int
    subject_id: int
    teacher_id: int
    title: str
    description: str | None
    assessment_type: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SearchLiveSessionItem(BaseModel):
    id: int
    class_id: int
    subject_id: int
    teacher_id: int
    title: str
    description: str | None
    session_type: str
    status: str
    scheduled_start_at: datetime
    scheduled_end_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class SearchMediaItem(BaseModel):
    id: int
    owner_id: int
    original_name: str
    file_name: str
    mime_type: str
    media_type: str
    visibility: str
    entity_type: str | None
    entity_id: int | None
    public_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class SearchResultsResponse(BaseModel):
    users: list[SearchUserItem]
    subjects: list[SearchSubjectItem]
    classes: list[SearchClassItem]
    posts: list[SearchPostItem]
    lessons: list[SearchLessonItem]
    quizzes: list[SearchQuizItem]
    live_sessions: list[SearchLiveSessionItem]
    media: list[SearchMediaItem]