from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user, require_roles
from app.models.audit_log import AuditLog
from app.models.report import Report
from app.models.user import User
from app.schemas.moderation import (
    AuditLogResponse,
    ModerationActionCreate,
    ModerationActionResponse,
    ModerationAssignRequest,
    ModerationMessageResponse,
    ModerationQueueItem,
    ModerationResolveRequest,
    ReportCreate,
    ReportResponse,
)
from app.services.moderation_service import (
    apply_moderation_action,
    assign_report,
    create_report,
    resolve_report,
)

router = APIRouter()


@router.post("/reports", response_model=ReportResponse)
def create_report_route(
    payload: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return create_report(
            db,
            current_user,
            payload.target_type,
            payload.target_id,
            payload.reason_code,
            payload.reason_text,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/reports/me", response_model=list[ReportResponse])
def my_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Report)
        .filter(Report.reporter_id == current_user.id)
        .order_by(Report.created_at.desc())
        .all()
    )


@router.get("/queue", response_model=list[ModerationQueueItem])
def moderation_queue(
    status: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    query = db.query(Report)

    if status:
        query = query.filter(Report.status == status)
    if priority:
        query = query.filter(Report.priority == priority)

    return query.order_by(Report.created_at.desc()).all()


@router.get("/reports/{report_id}", response_model=ReportResponse)
def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.post("/reports/{report_id}/assign", response_model=ReportResponse)
def assign_report_route(
    report_id: int,
    payload: ModerationAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    admin = db.query(User).filter(User.id == payload.admin_id, User.role == "admin").first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")

    return assign_report(db, report, admin)


@router.post("/reports/{report_id}/resolve", response_model=ReportResponse)
def resolve_report_route(
    report_id: int,
    payload: ModerationResolveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    return resolve_report(db, report, current_user, payload.status, payload.resolution_note)


@router.post("/actions", response_model=ModerationActionResponse)
def moderation_action_route(
    payload: ModerationActionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    try:
        return apply_moderation_action(
            db,
            admin=current_user,
            report_id=payload.report_id,
            target_type=payload.target_type,
            target_id=payload.target_id,
            action_type=payload.action_type,
            note=payload.note,
            is_reversible=payload.is_reversible,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/audit-logs", response_model=list[AuditLogResponse])
def list_audit_logs(
    action_type: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    query = db.query(AuditLog)

    if action_type:
        query = query.filter(AuditLog.action_type == action_type)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)

    return query.order_by(AuditLog.created_at.desc()).limit(200).all()