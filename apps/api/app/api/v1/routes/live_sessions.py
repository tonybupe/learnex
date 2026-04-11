from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user, require_roles
from app.models.live_session import LiveSession
from app.models.session_attendance import SessionAttendance
from app.models.user import User
from app.schemas.live_sessions import (
    JoinSessionResponse,
    LiveSessionActionResponse,
    LiveSessionCreate,
    LiveSessionResponse,
    LiveSessionUpdate,
    SessionAttendanceResponse,
)

from app.services.notification_service import create_live_session_reminders, notify_live_session_created
from app.services.live_session_service import (
    can_access_session,
    cancel_live_session,
    create_live_session,
    end_live_session,
    join_live_session,
    leave_live_session,
    start_live_session,
    update_live_session,
)

router = APIRouter()


@router.post("", response_model=LiveSessionResponse)
def create_session_route(
    payload: LiveSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("teacher")),
):
    try:
        session_obj = create_live_session(db, current_user, payload)
        notify_live_session_created(db, session_obj, current_user)
        create_live_session_reminders(db, session_obj, current_user)
        return session_obj
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("", response_model=List[LiveSessionResponse])
def list_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sessions = db.query(LiveSession).order_by(LiveSession.scheduled_start_at.desc()).all()
    visible = [s for s in sessions if can_access_session(db, s, current_user)]
    return visible


@router.get("/upcoming", response_model=List[LiveSessionResponse])
def list_upcoming_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sessions = (
        db.query(LiveSession)
        .filter(LiveSession.status.in_(["scheduled", "live"]))
        .order_by(LiveSession.scheduled_start_at.asc())
        .all()
    )
    visible = [s for s in sessions if can_access_session(db, s, current_user)]
    return visible


@router.get("/previous", response_model=List[LiveSessionResponse])
def list_previous_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sessions = (
        db.query(LiveSession)
        .filter(LiveSession.status.in_(["completed", "cancelled"]))
        .order_by(LiveSession.scheduled_start_at.desc())
        .all()
    )
    visible = [s for s in sessions if can_access_session(db, s, current_user)]
    return visible


@router.get("/{session_id}", response_model=LiveSessionResponse)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session_obj = db.query(LiveSession).filter(LiveSession.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")

    if not can_access_session(db, session_obj, current_user):
        raise HTTPException(status_code=403, detail="You do not have access to this session")

    return session_obj


@router.patch("/{session_id}", response_model=LiveSessionResponse)
def update_session_route(
    session_id: int,
    payload: LiveSessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("teacher", "admin")),
):
    session_obj = db.query(LiveSession).filter(LiveSession.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")

    if current_user.role == "teacher" and session_obj.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own sessions")

    try:
        return update_live_session(db, session_obj, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/{session_id}", response_model=LiveSessionActionResponse)
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("teacher", "admin")),
):
    session_obj = db.query(LiveSession).filter(LiveSession.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")

    if current_user.role == "teacher" and session_obj.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own sessions")

    db.delete(session_obj)
    db.commit()
    return LiveSessionActionResponse(message="Session deleted successfully")


@router.post("/{session_id}/start", response_model=LiveSessionActionResponse)
def start_session_route(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("teacher")),
):
    session_obj = db.query(LiveSession).filter(LiveSession.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        start_live_session(db, session_obj, current_user)
        return LiveSessionActionResponse(message="Session started successfully")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/{session_id}/end", response_model=LiveSessionActionResponse)
def end_session_route(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("teacher")),
):
    session_obj = db.query(LiveSession).filter(LiveSession.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        end_live_session(db, session_obj, current_user)
        return LiveSessionActionResponse(message="Session ended successfully")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/{session_id}/cancel", response_model=LiveSessionActionResponse)
def cancel_session_route(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("teacher")),
):
    session_obj = db.query(LiveSession).filter(LiveSession.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        cancel_live_session(db, session_obj, current_user)
        return LiveSessionActionResponse(message="Session cancelled successfully")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/{session_id}/join", response_model=JoinSessionResponse)
def join_session_route(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session_obj = db.query(LiveSession).filter(LiveSession.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")

    if not can_access_session(db, session_obj, current_user):
        raise HTTPException(status_code=403, detail="You do not have access to join this session")

    try:
        attendance = join_live_session(db, session_obj, current_user)
        return JoinSessionResponse(
            attendance_id=attendance.id,
            session_id=session_obj.id,
            meeting_url=session_obj.meeting_url,
            meeting_code=session_obj.meeting_code,
            message="Joined session successfully",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/{session_id}/leave", response_model=LiveSessionActionResponse)
def leave_session_route(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session_obj = db.query(LiveSession).filter(LiveSession.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        leave_live_session(db, session_obj, current_user)
        return LiveSessionActionResponse(message="Left session successfully")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/{session_id}/attendance", response_model=List[SessionAttendanceResponse])
def session_attendance(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session_obj = db.query(LiveSession).filter(LiveSession.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")

    if current_user.role not in {"admin"} and session_obj.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only view attendance for your own sessions")

    return (
        db.query(SessionAttendance)
        .filter(SessionAttendance.session_id == session_id)
        .order_by(SessionAttendance.joined_at.asc())
        .all()
    )