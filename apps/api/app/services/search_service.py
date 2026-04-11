from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.class_member import ClassMember
from app.models.class_room import ClassRoom
from app.models.lesson import Lesson
from app.models.live_session import LiveSession
from app.models.media_file import MediaFile
from app.models.post import Post
from app.models.quiz import Quiz
from app.models.subject import Subject
from app.models.user import User


def user_can_access_class(db: Session, class_id: int, user: User) -> bool:
    if user.role == "admin":
        return True

    classroom = db.query(ClassRoom).filter(ClassRoom.id == class_id).first()
    if not classroom:
        return False

    if user.role == "teacher" and classroom.teacher_id == user.id:
        return True

    if user.role == "learner":
        membership = (
            db.query(ClassMember)
            .filter(
                ClassMember.class_id == class_id,
                ClassMember.learner_id == user.id,
                ClassMember.status == "active",
            )
            .first()
        )
        return membership is not None

    return False


def search_users(db: Session, q: str, current_user: User, limit: int = 20):
    query = db.query(User).filter(
        or_(
            User.full_name.ilike(f"%{q}%"),
            User.email.ilike(f"%{q}%"),
            User.phone_number.ilike(f"%{q}%"),
            User.role.ilike(f"%{q}%"),
        )
    )

    if current_user.role != "admin":
        query = query.filter(User.is_active.is_(True))

    return query.order_by(User.created_at.desc()).limit(limit).all()


def search_subjects(db: Session, q: str, limit: int = 20):
    return (
        db.query(Subject)
        .filter(
            or_(
                Subject.name.ilike(f"%{q}%"),
                Subject.code.ilike(f"%{q}%"),
                Subject.description.ilike(f"%{q}%"),
            )
        )
        .order_by(Subject.name.asc())
        .limit(limit)
        .all()
    )


def search_classes(db: Session, q: str, current_user: User, limit: int = 20):
    classes = (
        db.query(ClassRoom)
        .filter(
            or_(
                ClassRoom.title.ilike(f"%{q}%"),
                ClassRoom.description.ilike(f"%{q}%"),
                ClassRoom.class_code.ilike(f"%{q}%"),
                ClassRoom.grade_level.ilike(f"%{q}%"),
            )
        )
        .order_by(ClassRoom.created_at.desc())
        .limit(limit * 3)
        .all()
    )

    visible = []
    for row in classes:
        if row.visibility == "public" or user_can_access_class(db, row.id, current_user):
            visible.append(row)
        if len(visible) >= limit:
            break
    return visible


def search_posts(db: Session, q: str, current_user: User, limit: int = 20):
    posts = (
        db.query(Post)
        .filter(
            Post.status == "published",
            or_(
                Post.title.ilike(f"%{q}%"),
                Post.content.ilike(f"%{q}%"),
            ),
        )
        .order_by(Post.created_at.desc())
        .limit(limit * 3)
        .all()
    )

    visible = []
    for row in posts:
        if row.visibility == "public":
            visible.append(row)
        elif row.class_id and user_can_access_class(db, row.class_id, current_user):
            visible.append(row)
        if len(visible) >= limit:
            break
    return visible


def search_lessons(db: Session, q: str, current_user: User, limit: int = 20):
    lessons = (
        db.query(Lesson)
        .filter(
            Lesson.status == "published",
            or_(
                Lesson.title.ilike(f"%{q}%"),
                Lesson.description.ilike(f"%{q}%"),
                Lesson.content.ilike(f"%{q}%"),
            ),
        )
        .order_by(Lesson.created_at.desc())
        .limit(limit * 3)
        .all()
    )

    visible = []
    for row in lessons:
        if row.visibility == "public":
            visible.append(row)
        elif user_can_access_class(db, row.class_id, current_user):
            visible.append(row)
        if len(visible) >= limit:
            break
    return visible


def search_quizzes(db: Session, q: str, current_user: User, limit: int = 20):
    quizzes = (
        db.query(Quiz)
        .filter(
            Quiz.status.in_(["published", "closed"]),
            or_(
                Quiz.title.ilike(f"%{q}%"),
                Quiz.description.ilike(f"%{q}%"),
                Quiz.assessment_type.ilike(f"%{q}%"),
            ),
        )
        .order_by(Quiz.created_at.desc())
        .limit(limit * 3)
        .all()
    )

    visible = []
    for row in quizzes:
        if user_can_access_class(db, row.class_id, current_user):
            visible.append(row)
        if len(visible) >= limit:
            break
    return visible


def search_live_sessions(db: Session, q: str, current_user: User, limit: int = 20):
    sessions = (
        db.query(LiveSession)
        .filter(
            or_(
                LiveSession.title.ilike(f"%{q}%"),
                LiveSession.description.ilike(f"%{q}%"),
                LiveSession.session_type.ilike(f"%{q}%"),
                LiveSession.status.ilike(f"%{q}%"),
            )
        )
        .order_by(LiveSession.scheduled_start_at.desc())
        .limit(limit * 3)
        .all()
    )

    visible = []
    for row in sessions:
        if user_can_access_class(db, row.class_id, current_user):
            visible.append(row)
        if len(visible) >= limit:
            break
    return visible


def search_media(db: Session, q: str, current_user: User, limit: int = 20):
    media = (
        db.query(MediaFile)
        .filter(
            MediaFile.is_deleted.is_(False),
            or_(
                MediaFile.original_name.ilike(f"%{q}%"),
                MediaFile.file_name.ilike(f"%{q}%"),
                MediaFile.mime_type.ilike(f"%{q}%"),
                MediaFile.media_type.ilike(f"%{q}%"),
                MediaFile.entity_type.ilike(f"%{q}%"),
            ),
        )
        .order_by(MediaFile.created_at.desc())
        .limit(limit * 3)
        .all()
    )

    visible = []
    for row in media:
        if current_user.role == "admin":
            visible.append(row)
        elif row.owner_id == current_user.id:
            visible.append(row)
        elif row.visibility == "public":
            visible.append(row)
        if len(visible) >= limit:
            break
    return visible