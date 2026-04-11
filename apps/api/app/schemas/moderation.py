from datetime import datetime
from pydantic import BaseModel, Field


class ReportCreate(BaseModel):
    target_type: str = Field(..., pattern="^(post|message|user|media|comment)$")
    target_id: int = Field(..., gt=0)
    reason_code: str = Field(..., min_length=2, max_length=50)
    reason_text: str | None = None


class ReportResponse(BaseModel):
    id: int
    reporter_id: int
    target_type: str
    target_id: int
    reason_code: str
    reason_text: str | None
    status: str
    priority: str
    assigned_admin_id: int | None
    resolved_by_id: int | None
    resolution_note: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ModerationAssignRequest(BaseModel):
    admin_id: int


class ModerationResolveRequest(BaseModel):
    status: str = Field(..., pattern="^(resolved|dismissed|escalated)$")
    resolution_note: str | None = None


class ModerationActionCreate(BaseModel):
    report_id: int | None = None
    target_type: str = Field(..., pattern="^(post|message|user|media|comment)$")
    target_id: int = Field(..., gt=0)
    action_type: str = Field(
        ...,
        pattern="^(warn|hide|disable|delete|restore|suspend_user|ban_user|dismiss_report)$"
    )
    note: str | None = None
    is_reversible: bool = True


class ModerationActionResponse(BaseModel):
    id: int
    report_id: int | None
    admin_id: int
    target_type: str
    target_id: int
    action_type: str
    note: str | None
    is_reversible: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AuditLogResponse(BaseModel):
    id: int
    actor_id: int | None
    action_type: str
    entity_type: str
    entity_id: int | None
    description: str
    metadata_json: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ModerationQueueItem(BaseModel):
    id: int
    reporter_id: int
    target_type: str
    target_id: int
    reason_code: str
    reason_text: str | None
    status: str
    priority: str
    assigned_admin_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ModerationMessageResponse(BaseModel):
    message: str