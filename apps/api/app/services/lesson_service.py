from sqlalchemy.orm import Session

from app.models.class_room import ClassRoom
from app.models.media_file import MediaFile
from app.models.lesson import Lesson
from app.models.lesson_resource import LessonResource
from app.models.subject import Subject
from app.models.user import User
from app.schemas.lessons import LessonCreate, LessonResourceCreate, LessonUpdate


def create_lesson(db: Session, teacher: User, payload: LessonCreate) -> Lesson:
    if teacher.role != "teacher":
        raise ValueError("Only teachers can create lessons")

    classroom = db.query(ClassRoom).filter(ClassRoom.id == payload.class_id).first()
    if not classroom:
        raise ValueError("Class not found")
    if classroom.teacher_id != teacher.id:
        raise ValueError("You can only create lessons for your own classes")

    subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not subject:
        raise ValueError("Subject not found")

    lesson = Lesson(
        class_id=payload.class_id,
        subject_id=payload.subject_id,
        teacher_id=teacher.id,
        title=payload.title,
        description=payload.description,
        content=payload.content,
        lesson_type=payload.lesson_type,
        visibility=payload.visibility,
        status=payload.status,
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return lesson


def update_lesson(db: Session, lesson: Lesson, payload: LessonUpdate) -> Lesson:
    if payload.class_id is not None:
        classroom = db.query(ClassRoom).filter(ClassRoom.id == payload.class_id).first()
        if not classroom:
            raise ValueError("Class not found")
        lesson.class_id = payload.class_id

    if payload.subject_id is not None:
        subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()
        if not subject:
            raise ValueError("Subject not found")
        lesson.subject_id = payload.subject_id

    if payload.title is not None:
        lesson.title = payload.title
    if payload.description is not None:
        lesson.description = payload.description
    if payload.content is not None:
        lesson.content = payload.content
    if payload.lesson_type is not None:
        lesson.lesson_type = payload.lesson_type
    if payload.visibility is not None:
        lesson.visibility = payload.visibility
    if payload.status is not None:
        lesson.status = payload.status

    db.commit()
    db.refresh(lesson)
    return lesson


def add_lesson_resource(db: Session, lesson: Lesson, payload: LessonResourceCreate) -> LessonResource:
    if payload.media_file_id is not None:
        media = db.query(MediaFile).filter(MediaFile.id == payload.media_file_id, MediaFile.is_deleted.is_(False)).first()
        if not media:
            raise ValueError("Media file not found")

    resource = LessonResource(
        lesson_id=lesson.id,
        media_file_id=payload.media_file_id,
        resource_type=payload.resource_type,
        url=payload.url,
        title=payload.title,
        mime_type=payload.mime_type,
    )
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return resource