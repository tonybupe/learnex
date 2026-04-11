from datetime import datetime
from pydantic import BaseModel, Field


class SubjectCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    code: str = Field(..., min_length=2, max_length=30)
    description: str | None = None


class SubjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    code: str | None = Field(default=None, min_length=2, max_length=30)
    description: str | None = None


class SubjectResponse(BaseModel):
    id: int
    name: str
    code: str
    description: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}