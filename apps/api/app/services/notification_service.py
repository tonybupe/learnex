from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.class_member import ClassMember
from app.models.class_room import ClassRoom
from app.models.follow import Follow
from app.models.live_session import LiveSession
from app.models.notification import Notification
from app.models.quiz import Quiz
from app.models.reminder import Reminder
from app.models.user import User


def create_notification(
    db: Session,
    *,
    user_id: int,
    actor_id: int | None,
    notification_type: str,
    title: str,
    message: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
    action_url: str | None = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        actor_id=actor_id,
        notification_type=notification_type,
        title=title,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
        action_url=action_url,
        is_read=False,
        is_seen=False,
    )
    db.add(notification)
    db.flush()
    return notification


def bulk_notify_user_ids(
    db: Session,
    *,
    user_ids: list[int],
    actor_id: int | None,
    notification_type: str,
    title: str,
    message: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
    action_url: str | None = None,
) -> None:
    unique_ids = sorted(set(user_ids))
    for user_id in unique_ids:
        create_notification(
            db,
            user_id=user_id,
            actor_id=actor_id,
            notification_type=notification_type,
            title=title,
            message=message,
            entity_type=entity_type,
            entity_id=entity_id,
            action_url=action_url,
        )
    db.commit()


def notify_new_follower(db: Session, follower: User, target_user: User) -> None:
    notification = Notification(
        user_id=target_user.id,
        actor_id=follower.id,
        notification_type="follow_created",
        title="New follower",
        message=f"{follower.full_name} started following you.",
        entity_type="user",
        entity_id=follower.id,
        action_url=f"/users/{follower.id}",
        is_read=False,
        is_seen=False,
    )
    db.add(notification)
    db.commit()


def notify_class_post(db: Session, post_id: int, author: User, class_id: int, title: str | None) -> None:
    member_ids = [
        row.learner_id
        for row in db.query(ClassMember)
        .filter(ClassMember.class_id == class_id, ClassMember.status == "active")
        .all()
    ]

    classroom = db.query(ClassRoom).filter(ClassRoom.id == class_id).first()
    if classroom and classroom.teacher_id != author.id:
        member_ids.append(classroom.teacher_id)

    member_ids = [uid for uid in set(member_ids) if uid != author.id]

    post_title = title or "New class post"
    bulk_notify_user_ids(
        db,
        user_ids=member_ids,
        actor_id=author.id,
        notification_type="class_post_created",
        title="New class post",
        message=f"{author.full_name} posted in class: {post_title}",
        entity_type="post",
        entity_id=post_id,
        action_url=f"/posts/{post_id}",
    )


def notify_lesson_published(db: Session, lesson_id: int, teacher: User, class_id: int, title: str) -> None:
    member_ids = [
        row.learner_id
        for row in db.query(ClassMember)
        .filter(ClassMember.class_id == class_id, ClassMember.status == "active")
        .all()
    ]

    bulk_notify_user_ids(
        db,
        user_ids=[uid for uid in member_ids if uid != teacher.id],
        actor_id=teacher.id,
        notification_type="lesson_published",
        title="New lesson available",
        message=f"{teacher.full_name} published a lesson: {title}",
        entity_type="lesson",
        entity_id=lesson_id,
        action_url=f"/lessons/{lesson_id}",
    )


def notify_quiz_published(db: Session, quiz: Quiz, teacher: User) -> None:
    member_ids = [
        row.learner_id
        for row in db.query(ClassMember)
        .filter(ClassMember.class_id == quiz.class_id, ClassMember.status == "active")
        .all()
    ]

    bulk_notify_user_ids(
        db,
        user_ids=[uid for uid in member_ids if uid != teacher.id],
        actor_id=teacher.id,
        notification_type="quiz_published",
        title="New assessment available",
        message=f"{teacher.full_name} published a {quiz.assessment_type}: {quiz.title}",
        entity_type="quiz",
        entity_id=quiz.id,
        action_url=f"/quizzes/{quiz.id}",
    )


def notify_live_session_created(db: Session, session: LiveSession, teacher: User) -> None:
    member_ids = [
        row.learner_id
        for row in db.query(ClassMember)
        .filter(ClassMember.class_id == session.class_id, ClassMember.status == "active")
        .all()
    ]

    bulk_notify_user_ids(
        db,
        user_ids=[uid for uid in member_ids if uid != teacher.id],
        actor_id=teacher.id,
        notification_type="live_session_scheduled",
        title="Live class scheduled",
        message=f"{teacher.full_name} scheduled a live session: {session.title}",
        entity_type="live_session",
        entity_id=session.id,
        action_url=f"/live-sessions/{session.id}",
    )


def create_live_session_reminders(db: Session, session: LiveSession, teacher: User) -> None:
    member_ids = [
        row.learner_id
        for row in db.query(ClassMember)
        .filter(ClassMember.class_id == session.class_id, ClassMember.status == "active")
        .all()
    ]

    reminder_time = session.scheduled_start_at
    for user_id in member_ids:
        reminder = Reminder(
            user_id=user_id,
            created_by_id=teacher.id,
            reminder_type="live_session_reminder",
            title="Upcoming live class",
            message=f"Your live session '{session.title}' is scheduled soon.",
            entity_type="live_session",
            entity_id=session.id,
            scheduled_for=reminder_time,
            is_sent=False,
            sent_at=None,
        )
        db.add(reminder)

    db.commit()


def create_custom_reminder(
    db: Session,
    *,
    user_id: int,
    created_by_id: int | None,
    reminder_type: str,
    title: str,
    message: str,
    scheduled_for,
    entity_type: str | None = None,
    entity_id: int | None = None,
) -> Reminder:
    reminder = Reminder(
        user_id=user_id,
        created_by_id=created_by_id,
        reminder_type=reminder_type,
        title=title,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
        scheduled_for=scheduled_for,
        is_sent=False,
        sent_at=None,
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


def dispatch_due_reminders(db: Session) -> int:
    now = datetime.now(timezone.utc)
    due = (
        db.query(Reminder)
        .filter(Reminder.is_sent.is_(False), Reminder.scheduled_for <= now)
        .all()
    )

    count = 0
    for reminder in due:
        create_notification(
            db,
            user_id=reminder.user_id,
            actor_id=reminder.created_by_id,
            notification_type=reminder.reminder_type,
            title=reminder.title,
            message=reminder.message,
            entity_type=reminder.entity_type,
            entity_id=reminder.entity_id,
            action_url=f"/{reminder.entity_type}s/{reminder.entity_id}" if reminder.entity_type and reminder.entity_id else None,
        )
        reminder.is_sent = True
        reminder.sent_at = now
        count += 1

    db.commit()
    return count


def mark_notification_read(db: Session, notification: Notification) -> Notification:
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


def mark_notification_seen(db: Session, notification: Notification) -> Notification:
    notification.is_seen = True
    db.commit()
    db.refresh(notification)
    return notification


def mark_all_seen(db: Session, user_id: int) -> int:
    rows = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_seen.is_(False))
        .all()
    )
    for row in rows:
        row.is_seen = True
    db.commit()
    return len(rows)


def mark_all_read(db: Session, user_id: int) -> int:
    rows = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read.is_(False))
        .all()
    )
    for row in rows:
        row.is_read = True
        row.is_seen = True
    db.commit()
    return len(rows)