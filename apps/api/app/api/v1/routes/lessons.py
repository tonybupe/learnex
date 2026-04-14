from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.deps import get_current_user, require_roles
from app.models.lesson import Lesson
from app.models.user import User
from app.schemas.lessons import (
    LessonCreate,
    LessonResourceCreate,
    LessonResourceResponse,
    LessonResponse,
    LessonUpdate,
)

from app.services.notification_service import notify_lesson_published
from app.services.lesson_service import add_lesson_resource, create_lesson, update_lesson

router = APIRouter()


def lesson_query(db: Session):
    return db.query(Lesson).options(joinedload(Lesson.resources))


@router.post("", response_model=LessonResponse)
def create_lesson_route(
    payload: LessonCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("teacher")),
):
    try:
        lesson = create_lesson(db, current_user, payload)
        if lesson.status == "published":
            notify_lesson_published(db, lesson.id, current_user, lesson.class_id, lesson.title)
        return lesson_query(db).filter(Lesson.id == lesson.id).first()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("", response_model=List[LessonResponse])
def list_lessons(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return lesson_query(db).order_by(Lesson.created_at.desc()).all()


@router.get("/{lesson_id}", response_model=LessonResponse)
def get_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lesson = lesson_query(db).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson


@router.patch("/{lesson_id}", response_model=LessonResponse)
def update_lesson_route(
    lesson_id: int,
    payload: LessonUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("teacher", "admin")),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    if current_user.role == "teacher" and lesson.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own lessons")

    try:
        updated = update_lesson(db, lesson, payload)
        return lesson_query(db).filter(Lesson.id == updated.id).first()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/{lesson_id}")
def delete_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("teacher", "admin")),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    if current_user.role == "teacher" and lesson.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own lessons")

    db.delete(lesson)
    db.commit()
    return {"message": "Lesson deleted successfully"}


@router.post("/{lesson_id}/resources", response_model=LessonResourceResponse)
def add_resource_route(
    lesson_id: int,
    payload: LessonResourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("teacher", "admin")),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    if current_user.role == "teacher" and lesson.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only manage your own lesson resources")

    return add_lesson_resource(db, lesson, payload)

# =========================================================
# LESSON DISCUSSION (comments by enrolled learners)
# =========================================================

from app.models.lesson_discussion import LessonDiscussion


@router.get("/{lesson_id}/discussion")
def get_lesson_discussion(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    comments = (
        db.query(LessonDiscussion)
        .filter(LessonDiscussion.lesson_id == lesson_id)
        .order_by(LessonDiscussion.created_at.asc())
        .all()
    )
    result = []
    for c in comments:
        author = db.query(User).filter(User.id == c.user_id).first()
        result.append({
            "id": c.id,
            "content": c.content,
            "user_id": c.user_id,
            "lesson_id": c.lesson_id,
            "created_at": c.created_at,
            "author": {
                "id": author.id,
                "full_name": author.full_name,
                "role": author.role,
            } if author else None,
        })
    return result


@router.post("/{lesson_id}/discussion")
def add_lesson_comment(
    lesson_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    content = payload.get("content", "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Comment cannot be empty")
    comment = LessonDiscussion(
        lesson_id=lesson_id,
        user_id=current_user.id,
        content=content,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return {
        "id": comment.id,
        "content": comment.content,
        "user_id": comment.user_id,
        "lesson_id": comment.lesson_id,
        "created_at": comment.created_at,
        "author": {
            "id": current_user.id,
            "full_name": current_user.full_name,
            "role": current_user.role,
        },
    }


@router.delete("/{lesson_id}/discussion/{comment_id}")
def delete_lesson_comment(
    lesson_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = db.query(LessonDiscussion).filter(
        LessonDiscussion.id == comment_id,
        LessonDiscussion.lesson_id == lesson_id,
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id and current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Not allowed")
    db.delete(comment)
    db.commit()
    return {"message": "Deleted"}