from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.class_member import ClassMember
from app.models.class_room import ClassRoom
from app.models.lesson import Lesson
from app.models.live_session import LiveSession
from app.models.session_attendance import SessionAttendance
from app.models.subject import Subject
from app.models.user import User
from app.schemas.live_sessions import LiveSessionCreate, LiveSessionUpdate


def create_live_session(db: Session, teacher: User, payload: LiveSessionCreate) -> LiveSession:
    if teacher.role != "teacher":
        raise ValueError("Only teachers can create live sessions")

    classroom = db.query(ClassRoom).filter(ClassRoom.id == payload.class_id).first()
    if not classroom:
        raise ValueError("Class not found")
    if classroom.teacher_id != teacher.id:
        raise ValueError("You can only create sessions for your own classes")

    subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not subject:
        raise ValueError("Subject not found")

    if payload.lesson_id is not None:
        lesson = db.query(Lesson).filter(Lesson.id == payload.lesson_id).first()
        if not lesson:
            raise ValueError("Lesson not found")

    if payload.scheduled_end_at <= payload.scheduled_start_at:
        raise ValueError("Scheduled end time must be after start time")

    session = LiveSession(
        class_id=payload.class_id,
        subject_id=payload.subject_id,
        teacher_id=teacher.id,
        lesson_id=payload.lesson_id,
        title=payload.title,
        description=payload.description,
        session_type=payload.session_type,
        status="scheduled",
        meeting_provider=payload.meeting_provider,
        meeting_url=payload.meeting_url,
        meeting_code=payload.meeting_code,
        scheduled_start_at=payload.scheduled_start_at,
        scheduled_end_at=payload.scheduled_end_at,
        allow_replay=payload.allow_replay,
        recording_url=payload.recording_url,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def update_live_session(db: Session, session: LiveSession, payload: LiveSessionUpdate) -> LiveSession:
    if payload.title is not None:
        session.title = payload.title
    if payload.description is not None:
        session.description = payload.description
    if payload.session_type is not None:
        session.session_type = payload.session_type
    if payload.status is not None:
        session.status = payload.status
    if payload.meeting_provider is not None:
        session.meeting_provider = payload.meeting_provider
    if payload.meeting_url is not None:
        session.meeting_url = payload.meeting_url
    if payload.meeting_code is not None:
        session.meeting_code = payload.meeting_code
    if payload.scheduled_start_at is not None:
        session.scheduled_start_at = payload.scheduled_start_at
    if payload.scheduled_end_at is not None:
        session.scheduled_end_at = payload.scheduled_end_at
    if payload.allow_replay is not None:
        session.allow_replay = payload.allow_replay
    if payload.recording_url is not None:
        session.recording_url = payload.recording_url

    if session.scheduled_end_at <= session.scheduled_start_at:
        raise ValueError("Scheduled end time must be after start time")

    db.commit()
    db.refresh(session)
    return session


def start_live_session(db: Session, session: LiveSession, teacher: User) -> LiveSession:
    if teacher.role != "teacher":
        raise ValueError("Only teachers can start live sessions")
    if session.teacher_id != teacher.id:
        raise ValueError("You can only start your own sessions")
    if session.status == "cancelled":
        raise ValueError("Cancelled session cannot be started")
    if session.status == "completed":
        raise ValueError("Completed session cannot be started again")

    session.status = "live"
    if session.actual_start_at is None:
        session.actual_start_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(session)
    return session


def end_live_session(db: Session, session: LiveSession, teacher: User) -> LiveSession:
    if teacher.role != "teacher":
        raise ValueError("Only teachers can end live sessions")
    if session.teacher_id != teacher.id:
        raise ValueError("You can only end your own sessions")
    if session.status == "cancelled":
        raise ValueError("Cancelled session cannot be ended")

    session.status = "completed"
    session.actual_end_at = datetime.now(timezone.utc)

    active_attendance = (
        db.query(SessionAttendance)
        .filter(
            SessionAttendance.session_id == session.id,
            SessionAttendance.left_at.is_(None),
        )
        .all()
    )

    now = datetime.now(timezone.utc)
    for row in active_attendance:
        row.left_at = now
        row.attendance_status = "completed"
        row.duration_seconds = int((now - row.joined_at).total_seconds())

    db.commit()
    db.refresh(session)
    return session


def cancel_live_session(db: Session, session: LiveSession, teacher: User) -> LiveSession:
    if teacher.role != "teacher":
        raise ValueError("Only teachers can cancel live sessions")
    if session.teacher_id != teacher.id:
        raise ValueError("You can only cancel your own sessions")
    if session.status == "completed":
        raise ValueError("Completed session cannot be cancelled")

    session.status = "cancelled"
    db.commit()
    db.refresh(session)
    return session


def can_access_session(db: Session, session: LiveSession, user: User) -> bool:
    if user.role == "admin":
        return True

    if user.role == "teacher" and session.teacher_id == user.id:
        return True

    if user.role == "learner":
        membership = (
            db.query(ClassMember)
            .filter(
                ClassMember.class_id == session.class_id,
                ClassMember.learner_id == user.id,
                ClassMember.status == "active",
            )
            .first()
        )
        return membership is not None

    return False


def join_live_session(db: Session, session: LiveSession, user: User) -> SessionAttendance:
    existing = (
        db.query(SessionAttendance)
        .filter(
            SessionAttendance.session_id == session.id,
            SessionAttendance.user_id == user.id,
        )
        .first()
    )

    now = datetime.now(timezone.utc)

    if existing:
        if existing.left_at is None:
            raise ValueError("User is already in this session")
        existing.joined_at = now
        existing.left_at = None
        existing.duration_seconds = None
        existing.attendance_status = "joined"
        db.commit()
        db.refresh(existing)
        return existing

    attendance = SessionAttendance(
        session_id=session.id,
        user_id=user.id,
        role_at_join=user.role,
        attendance_status="joined",
        joined_at=now,
    )
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return attendance


def leave_live_session(db: Session, session: LiveSession, user: User) -> SessionAttendance:
    attendance = (
        db.query(SessionAttendance)
        .filter(
            SessionAttendance.session_id == session.id,
            SessionAttendance.user_id == user.id,
            SessionAttendance.left_at.is_(None),
        )
        .first()
    )

    if not attendance:
        raise ValueError("Active session attendance not found")

    now = datetime.now(timezone.utc)
    attendance.left_at = now
    attendance.attendance_status = "left" if session.status != "completed" else "completed"
    attendance.duration_seconds = int((now - attendance.joined_at).total_seconds())

    db.commit()
    db.refresh(attendance)
    return attendance