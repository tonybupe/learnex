from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.search import (
    SearchClassItem,
    SearchLessonItem,
    SearchLiveSessionItem,
    SearchMediaItem,
    SearchPostItem,
    SearchQuizItem,
    SearchResultsResponse,
    SearchSubjectItem,
    SearchUserItem,
)
from app.services.search_service import (
    search_classes,
    search_lessons,
    search_live_sessions,
    search_media,
    search_posts,
    search_quizzes,
    search_subjects,
    search_users,
)

router = APIRouter()


@router.get("", response_model=SearchResultsResponse)
def global_search(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    users = search_users(db, q, current_user, limit)
    subjects = search_subjects(db, q, limit)
    classes = search_classes(db, q, current_user, limit)
    posts = search_posts(db, q, current_user, limit)
    lessons = search_lessons(db, q, current_user, limit)
    quizzes = search_quizzes(db, q, current_user, limit)
    live_sessions = search_live_sessions(db, q, current_user, limit)
    media = search_media(db, q, current_user, limit)

    return SearchResultsResponse(
        users=[SearchUserItem.model_validate(x) for x in users],
        subjects=[SearchSubjectItem.model_validate(x) for x in subjects],
        classes=[SearchClassItem.model_validate(x) for x in classes],
        posts=[SearchPostItem.model_validate(x) for x in posts],
        lessons=[SearchLessonItem.model_validate(x) for x in lessons],
        quizzes=[SearchQuizItem.model_validate(x) for x in quizzes],
        live_sessions=[SearchLiveSessionItem.model_validate(x) for x in live_sessions],
        media=[SearchMediaItem.model_validate(x) for x in media],
    )


@router.get("/users", response_model=list[SearchUserItem])
def discover_users(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return search_users(db, q, current_user, limit)


@router.get("/subjects", response_model=list[SearchSubjectItem])
def discover_subjects(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return search_subjects(db, q, limit)


@router.get("/classes", response_model=list[SearchClassItem])
def discover_classes(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return search_classes(db, q, current_user, limit)


@router.get("/posts", response_model=list[SearchPostItem])
def discover_posts(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return search_posts(db, q, current_user, limit)


@router.get("/lessons", response_model=list[SearchLessonItem])
def discover_lessons(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return search_lessons(db, q, current_user, limit)


@router.get("/quizzes", response_model=list[SearchQuizItem])
def discover_quizzes(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return search_quizzes(db, q, current_user, limit)


@router.get("/live-sessions", response_model=list[SearchLiveSessionItem])
def discover_live_sessions(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return search_live_sessions(db, q, current_user, limit)


@router.get("/media", response_model=list[SearchMediaItem])
def discover_media(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return search_media(db, q, current_user, limit)