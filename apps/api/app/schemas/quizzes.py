from datetime import datetime
from pydantic import BaseModel, Field


class QuizCreate(BaseModel):
    class_id: int
    subject_id: int
    lesson_id: int | None = None
    title: str = Field(..., min_length=2, max_length=200)
    description: str | None = None
    assessment_type: str = Field(default="quiz", pattern="^(quiz|test|exam|assignment)$")
    status: str = Field(default="draft", pattern="^(draft|published|closed|archived)$")
    time_limit_minutes: int | None = None
    attempts_allowed: int = Field(default=1, ge=1)
    is_auto_marked: bool = True


class QuizUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = None
    assessment_type: str | None = Field(default=None, pattern="^(quiz|test|exam|assignment)$")
    status: str | None = Field(default=None, pattern="^(draft|published|closed|archived)$")
    time_limit_minutes: int | None = None
    attempts_allowed: int | None = Field(default=None, ge=1)
    is_auto_marked: bool | None = None


class QuizOptionCreate(BaseModel):
    option_text: str = Field(..., min_length=1)
    is_correct: bool = False


class QuizQuestionCreate(BaseModel):
    question_text: str = Field(..., min_length=1)
    question_type: str = Field(default="single_choice", pattern="^(single_choice|multiple_choice|true_false|short_text)$")
    points: int = Field(default=1, ge=1)
    order_index: int = Field(default=1, ge=1)
    is_required: bool = True
    options: list[QuizOptionCreate] = []


class QuizOptionResponse(BaseModel):
    id: int
    option_text: str
    is_correct: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class QuizQuestionResponse(BaseModel):
    id: int
    question_text: str
    question_type: str
    points: int
    order_index: int
    is_required: bool
    options: list[QuizOptionResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class QuizResponse(BaseModel):
    id: int
    class_id: int
    subject_id: int
    lesson_id: int | None
    teacher_id: int
    title: str
    description: str | None
    assessment_type: str
    status: str
    time_limit_minutes: int | None
    attempts_allowed: int
    is_auto_marked: bool
    available_from: datetime | None
    available_to: datetime | None
    questions: list[QuizQuestionResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class QuizAttemptStartResponse(BaseModel):
    attempt_id: int
    message: str


class QuizAnswerSubmit(BaseModel):
    question_id: int
    selected_option_id: int | None = None
    answer_text: str | None = None


class QuizSubmissionRequest(BaseModel):
    answers: list[QuizAnswerSubmit]


class QuizAttemptResponse(BaseModel):
    id: int
    quiz_id: int
    learner_id: int
    status: str
    started_at: datetime
    submitted_at: datetime | None
    score: float | None
    max_score: float | None
    percentage: float | None
    attempt_number: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class QuizActionResponse(BaseModel):
    message: str