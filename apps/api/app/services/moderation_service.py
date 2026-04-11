from sqlalchemy.orm import Session

from app.models.media_file import MediaFile
from app.models.message import Message
from app.models.moderation_action import ModerationAction
from app.models.post import Post
from app.models.report import Report
from app.models.user import User
from app.services.audit_service import log_audit_event
from app.services.notification_service import create_notification


def calculate_priority(reason_code: str) -> str:
    high = {"harassment", "violence", "nudity", "abuse"}
    critical = {"child_safety", "threat", "extremism"}
    if reason_code in critical:
        return "critical"
    if reason_code in high:
        return "high"
    return "normal"


def resolve_report_target(db: Session, target_type: str, target_id: int):
    if target_type == "post":
        return db.query(Post).filter(Post.id == target_id).first()
    if target_type == "message":
        return db.query(Message).filter(Message.id == target_id).first()
    if target_type == "user":
        return db.query(User).filter(User.id == target_id).first()
    if target_type == "media":
        return db.query(MediaFile).filter(MediaFile.id == target_id).first()
    return None


def create_report(db: Session, reporter: User, target_type: str, target_id: int, reason_code: str, reason_text: str | None) -> Report:
    target = resolve_report_target(db, target_type, target_id)
    if not target:
        raise ValueError("Reported target not found")

    report = Report(
        reporter_id=reporter.id,
        target_type=target_type,
        target_id=target_id,
        reason_code=reason_code,
        reason_text=reason_text,
        status="open",
        priority=calculate_priority(reason_code),
        assigned_admin_id=None,
        resolved_by_id=None,
        resolution_note=None,
    )
    db.add(report)
    db.flush()

    log_audit_event(
        db,
        actor_id=reporter.id,
        action_type="report_created",
        entity_type=target_type,
        entity_id=target_id,
        description=f"User submitted report on {target_type} {target_id}",
        metadata={
            "reason_code": reason_code,
            "report_id": report.id,
        },
    )

    db.commit()
    db.refresh(report)
    return report


def assign_report(db: Session, report: Report, admin: User) -> Report:
    report.assigned_admin_id = admin.id
    report.status = "in_review"

    log_audit_event(
        db,
        actor_id=admin.id,
        action_type="report_assigned",
        entity_type="report",
        entity_id=report.id,
        description=f"Report {report.id} assigned to admin {admin.id}",
        metadata={"assigned_admin_id": admin.id},
    )

    db.commit()
    db.refresh(report)
    return report


def resolve_report(db: Session, report: Report, admin: User, status: str, resolution_note: str | None) -> Report:
    report.status = status
    report.resolved_by_id = admin.id
    report.resolution_note = resolution_note

    log_audit_event(
        db,
        actor_id=admin.id,
        action_type="report_resolved",
        entity_type="report",
        entity_id=report.id,
        description=f"Report {report.id} resolved with status {status}",
        metadata={
            "status": status,
            "resolution_note": resolution_note,
        },
    )

    db.commit()
    db.refresh(report)
    return report


def apply_moderation_action(
    db: Session,
    *,
    admin: User,
    report_id: int | None,
    target_type: str,
    target_id: int,
    action_type: str,
    note: str | None,
    is_reversible: bool,
) -> ModerationAction:
    target = resolve_report_target(db, target_type, target_id)
    if not target:
        raise ValueError("Target not found")

    if target_type == "post":
        if action_type in {"hide", "disable"}:
            target.status = "archived"
        elif action_type == "restore":
            target.status = "published"
        elif action_type == "delete":
            target.status = "deleted"
    elif target_type == "message":
        if action_type in {"hide", "disable", "delete"}:
            target.is_deleted = True
            target.content = "[removed by moderation]"
        elif action_type == "restore":
            target.is_deleted = False
    elif target_type == "user":
        if action_type in {"disable", "suspend_user", "ban_user"}:
            target.is_active = False
        elif action_type == "restore":
            target.is_active = True
    elif target_type == "media":
        if action_type in {"hide", "disable", "delete"}:
            target.is_active = False
            target.is_deleted = True
        elif action_type == "restore":
            target.is_active = True
            target.is_deleted = False

    action = ModerationAction(
        report_id=report_id,
        admin_id=admin.id,
        target_type=target_type,
        target_id=target_id,
        action_type=action_type,
        note=note,
        is_reversible=is_reversible,
    )
    db.add(action)
    db.flush()

    log_audit_event(
        db,
        actor_id=admin.id,
        action_type="moderation_action_applied",
        entity_type=target_type,
        entity_id=target_id,
        description=f"Applied moderation action {action_type} to {target_type} {target_id}",
        metadata={
            "report_id": report_id,
            "action_id": action.id,
            "note": note,
        },
    )

    if target_type == "user":
        create_notification(
            db,
            user_id=target.id,
            actor_id=admin.id,
            notification_type="moderation_action",
            title="Account moderation notice",
            message=f"A moderation action has been applied to your account: {action_type}",
            entity_type="user",
            entity_id=target.id,
            action_url="/support/moderation",
        )
    elif hasattr(target, "owner_id") and getattr(target, "owner_id", None):
        create_notification(
            db,
            user_id=target.owner_id,
            actor_id=admin.id,
            notification_type="moderation_action",
            title="Content moderation notice",
            message=f"A moderation action has been applied to your content: {action_type}",
            entity_type=target_type,
            entity_id=target_id,
            action_url="/support/moderation",
        )
    elif hasattr(target, "sender_id") and getattr(target, "sender_id", None):
        create_notification(
            db,
            user_id=target.sender_id,
            actor_id=admin.id,
            notification_type="moderation_action",
            title="Message moderation notice",
            message=f"A moderation action has been applied to your message: {action_type}",
            entity_type=target_type,
            entity_id=target_id,
            action_url="/support/moderation",
        )
    elif hasattr(target, "author_id") and getattr(target, "author_id", None):
        create_notification(
            db,
            user_id=target.author_id,
            actor_id=admin.id,
            notification_type="moderation_action",
            title="Post moderation notice",
            message=f"A moderation action has been applied to your post: {action_type}",
            entity_type=target_type,
            entity_id=target_id,
            action_url="/support/moderation",
        )

    db.commit()
    db.refresh(action)
    return action