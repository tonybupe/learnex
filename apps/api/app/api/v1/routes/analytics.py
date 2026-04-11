from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user, require_roles
from app.models.class_room import ClassRoom
from app.models.lesson import Lesson
from app.models.live_session import LiveSession
from app.models.quiz import Quiz
from app.models.user import User
from app.schemas.analytics import (
    AdminPlatformHealthSummaryResponse,
    ClassPerformanceStatsResponse,
    LearnerDashboardSummaryResponse,
    LessonEngagementResponse,
    LiveSessionAnalyticsResponse,
    QuizAnalyticsResponse,
    TeacherDashboardSummaryResponse,
    UserActivityStatsResponse,
)
from app.services.analytics_service import (
    get_admin_platform_health_summary,
    get_class_performance_stats,
    get_learner_dashboard_summary,
    get_lesson_engagement,
    get_live_session_analytics,
    get_quiz_analytics,
    get_teacher_dashboard_summary,
    get_user_activity_stats,
)

router = APIRouter()


@router.get("/users/{user_id}/activity", response_model=UserActivityStatsResponse)
def user_activity_stats(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="You can only view your own activity stats")
    return get_user_activity_stats(db, user_id)


@router.get("/classes/{class_id}/performance", response_model=ClassPerformanceStatsResponse)
def class_performance_stats(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    classroom = db.query(ClassRoom).filter(ClassRoom.id == class_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Class not found")

    if current_user.role not in ["admin"] and classroom.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the class teacher or admin can view class analytics")

    try:
        return get_class_performance_stats(db, class_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/lessons/{lesson_id}/engagement", response_model=LessonEngagementResponse)
def lesson_engagement_stats(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    if current_user.role not in ["admin"] and lesson.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the lesson teacher or admin can view lesson analytics")

    try:
        return get_lesson_engagement(db, lesson_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/quizzes/{quiz_id}", response_model=QuizAnalyticsResponse)
def quiz_analytics(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    if current_user.role not in ["admin"] and quiz.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the quiz owner or admin can view quiz analytics")

    try:
        return get_quiz_analytics(db, quiz_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/live-sessions/{live_session_id}", response_model=LiveSessionAnalyticsResponse)
def live_session_analytics(
    live_session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(LiveSession).filter(LiveSession.id == live_session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Live session not found")

    if current_user.role not in ["admin"] and session.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the live session host or admin can view session analytics")

    try:
        return get_live_session_analytics(db, live_session_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/dashboard/teacher", response_model=TeacherDashboardSummaryResponse)
def teacher_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("teacher", "admin")),
):
    teacher_id = current_user.id
    return get_teacher_dashboard_summary(db, teacher_id)


@router.get("/dashboard/admin", response_model=AdminPlatformHealthSummaryResponse)
def admin_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    return get_admin_platform_health_summary(db)


@router.get("/dashboard/learner", response_model=LearnerDashboardSummaryResponse)
def learner_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("learner", "admin")),
):
    learner_id = current_user.id
    return get_learner_dashboard_summary(db, learner_id)