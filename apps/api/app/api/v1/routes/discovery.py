from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.deps import get_current_user
from app.models.class_member import ClassMember
from app.models.class_room import ClassRoom
from app.models.lesson import Lesson
from app.models.live_session import LiveSession
from app.models.post import Post
from app.models.quiz import Quiz
from app.models.user import User

router = APIRouter()

@router.get("/home")
def discovery_home(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    my_class_ids: list[int] = []
    if current_user.role == "teacher":
        my_class_ids = [r.id for r in db.query(ClassRoom).filter(ClassRoom.teacher_id == current_user.id).all()]
    elif current_user.role == "learner":
        my_class_ids = [r.class_id for r in db.query(ClassMember).filter(ClassMember.learner_id == current_user.id, ClassMember.status == "active").all()]

    recent_posts = db.query(Post).filter(Post.status == "published").order_by(Post.created_at.desc()).limit(10).all()
    recent_lessons = db.query(Lesson).filter(Lesson.status == "published").order_by(Lesson.created_at.desc()).limit(10).all()
    upcoming_sessions = db.query(LiveSession).filter(LiveSession.status.in_(["scheduled", "live"])).order_by(LiveSession.scheduled_start_at.asc()).limit(10).all()
    recent_quizzes = db.query(Quiz).filter(Quiz.status.in_(["published", "closed"])).order_by(Quiz.created_at.desc()).limit(10).all()

    if my_class_ids:
        recent_posts = [x for x in recent_posts if x.visibility == "public" or x.class_id in my_class_ids][:10]
        recent_lessons = [x for x in recent_lessons if x.visibility == "public" or x.class_id in my_class_ids][:10]
        upcoming_sessions = [x for x in upcoming_sessions if x.class_id in my_class_ids][:10]
        recent_quizzes = [x for x in recent_quizzes if x.class_id in my_class_ids][:10]
    else:
        recent_posts = [x for x in recent_posts if x.visibility == "public"][:10]
        recent_lessons = [x for x in recent_lessons if x.visibility == "public"][:10]
        upcoming_sessions = []
        recent_quizzes = []

    return {
        "recent_posts": recent_posts,
        "recent_lessons": recent_lessons,
        "upcoming_sessions": upcoming_sessions,
        "recent_quizzes": recent_quizzes,
    }


@router.get("/trending-teachers")
def trending_teachers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    teachers = (
        db.query(User)
        .filter(User.role == "teacher", User.is_active.is_(True))
        .order_by(User.created_at.desc())
        .limit(20)
        .all()
    )

    # Enrich with class count and learner count
    result = []
    for t in teachers:
        classes = db.query(ClassRoom).filter(ClassRoom.teacher_id == t.id).all()
        class_ids = [c.id for c in classes]
        learner_count = 0
        if class_ids:
            learner_count = db.query(ClassMember).filter(
                ClassMember.class_id.in_(class_ids),
                ClassMember.status == "active"
            ).count()
        lesson_count = db.query(Lesson).filter(
            Lesson.teacher_id == t.id,
            Lesson.status == "published"
        ).count()
        result.append({
            "id": t.id,
            "full_name": t.full_name,
            "email": t.email,
            "role": t.role,
            "is_active": t.is_active,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "classes_count": len(classes),
            "learners_count": learner_count,
            "lessons_count": lesson_count,
            "followers_count": learner_count,  # use learner count as followers proxy
        })

    # Sort by learner count desc
    result.sort(key=lambda x: x["learners_count"], reverse=True)
    return result


@router.get("/public-classes")
def public_classes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    classes = (
        db.query(ClassRoom)
        .filter(ClassRoom.visibility == "public")
        .order_by(ClassRoom.created_at.desc())
        .limit(20)
        .all()
    )

    result = []
    for cls in classes:
        # Learner count
        learner_count = db.query(ClassMember).filter(
            ClassMember.class_id == cls.id,
            ClassMember.status == "active"
        ).count()
        # Lesson count
        lesson_count = db.query(Lesson).filter(
            Lesson.class_id == cls.id,
            Lesson.status == "published"
        ).count()
        # Teacher info
        teacher = db.query(User).filter(User.id == cls.teacher_id).first()

        result.append({
            "id": cls.id,
            "title": cls.title,
            "name": cls.title,  # alias for compatibility
            "description": cls.description,
            "visibility": cls.visibility,
            "is_public": cls.visibility == "public",
            "grade_level": cls.grade_level,
            "class_code": cls.class_code,
            "status": cls.status,
            "teacher_id": cls.teacher_id,
            "subject_id": cls.subject_id,
            "created_at": cls.created_at.isoformat() if cls.created_at else None,
            "enrolled_count": learner_count,
            "lesson_count": lesson_count,
            "teacher": {
                "id": teacher.id,
                "full_name": teacher.full_name,
            } if teacher else None,
        })

    # Sort by learner count
    result.sort(key=lambda x: x["enrolled_count"], reverse=True)
    return result