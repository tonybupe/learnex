from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user, require_roles
from app.models.notification import Notification
from app.models.reminder import Reminder
from app.models.user import User
from app.schemas.notifications import (
    NotificationActionResponse,
    NotificationResponse,
    ReminderCreate,
    ReminderResponse,
)
from app.services.notification_service import (
    create_custom_reminder,
    dispatch_due_reminders,
    mark_all_read,
    mark_all_seen,
    mark_notification_read,
    mark_notification_seen,
)

router = APIRouter()


@router.get("", response_model=List[NotificationResponse])
def list_my_notifications(
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        query = query.filter(Notification.is_read.is_(False))
    return query.order_by(Notification.created_at.desc()).all()


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read.is_(False))
        .count()
    )
    return {"unread_count": count}


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_read_route(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return mark_notification_read(db, notification)


@router.patch("/{notification_id}/seen", response_model=NotificationResponse)
def mark_seen_route(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return mark_notification_seen(db, notification)


@router.patch("/mark-all-read", response_model=NotificationActionResponse)
def mark_all_read_route(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = mark_all_read(db, current_user.id)
    return NotificationActionResponse(message=f"{count} notifications marked as read")


@router.patch("/mark-all-seen", response_model=NotificationActionResponse)
def mark_all_seen_route(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = mark_all_seen(db, current_user.id)
    return NotificationActionResponse(message=f"{count} notifications marked as seen")


@router.get("/reminders", response_model=List[ReminderResponse])
def list_my_reminders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Reminder)
        .filter(Reminder.user_id == current_user.id)
        .order_by(Reminder.scheduled_for.asc())
        .all()
    )


@router.post("/reminders", response_model=ReminderResponse)
def create_reminder_route(
    payload: ReminderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "teacher")),
):
    reminder = create_custom_reminder(
        db,
        user_id=payload.user_id,
        created_by_id=current_user.id,
        reminder_type=payload.reminder_type,
        title=payload.title,
        message=payload.message,
        scheduled_for=payload.scheduled_for,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
    )
    return reminder


@router.post("/dispatch-reminders", response_model=NotificationActionResponse)
def dispatch_reminders_route(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    count = dispatch_due_reminders(db)
    return NotificationActionResponse(message=f"{count} reminders dispatched")