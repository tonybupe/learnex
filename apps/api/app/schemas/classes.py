from datetime import datetime
from pydantic import BaseModel, Field


class ClassCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=150)
    description: str | None = None
    class_code: str = Field(..., min_length=3, max_length=40)
    grade_level: str | None = Field(default=None, max_length=30)
    visibility: str = Field(default="public", pattern="^(public|private)$")
    subject_id: int


class ClassUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=150)
    description: str | None = None
    grade_level: str | None = Field(default=None, max_length=30)
    visibility: str | None = Field(default=None, pattern="^(public|private)$")
    status: str | None = Field(default=None, pattern="^(active|archived)$")
    subject_id: int | None = None


class TeacherMiniResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone_number: str
    role: str

    model_config = {"from_attributes": True}


class SubjectMiniResponse(BaseModel):
    id: int
    name: str
    code: str

    model_config = {"from_attributes": True}


class ClassResponse(BaseModel):
    id: int
    title: str
    description: str | None
    class_code: str
    grade_level: str | None
    visibility: str
    status: str
    teacher: TeacherMiniResponse
    subject: SubjectMiniResponse
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ClassMembershipActionResponse(BaseModel):
    message: str


# -----------------------------
# NEW: Learner Mini Schema
# -----------------------------

class LearnerMiniResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str

    model_config = {"from_attributes": True}


# -----------------------------
# UPDATED: ClassMemberResponse
# -----------------------------

class ClassMemberResponse(BaseModel):
    id: int
    learner_id: int
    class_id: int
    status: str
    created_at: datetime
    updated_at: datetime

    learner: LearnerMiniResponse  # ✅ Include learner relationship

    model_config = {"from_attributes": True}