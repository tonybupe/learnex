from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.deps import get_current_user, require_roles
from app.models.quiz import Quiz
from app.models.quiz_attempt import QuizAttempt
from app.models.quiz_question import QuizQuestion
from app.models.user import User
from app.schemas.quizzes import (
    QuizActionResponse,
    QuizAttemptResponse,
    QuizAttemptStartResponse,
    QuizCreate,
    QuizQuestionCreate,
    QuizQuestionResponse,
    QuizResponse,
    QuizSubmissionRequest,
    QuizUpdate,
)
from app.services.notification_service import notify_quiz_published
from app.services.quiz_service import add_question, create_quiz, start_attempt, submit_attempt, update_quiz

router = APIRouter()


def quiz_query(db: Session):
    return db.query(Quiz).options(
        joinedload(Quiz.questions).joinedload(QuizQuestion.options)
    )


@router.post("", response_model=QuizResponse)
def create_quiz_route(
    payload: QuizCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("teacher")),
):
    try:
        quiz = create_quiz(db, current_user, payload)
        if quiz.status == "published":
            notify_quiz_published(db, quiz.id, current_user, quiz.class_id, quiz.title)
        return quiz_query(db).filter(Quiz.id == quiz.id).first()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("", response_model=List[QuizResponse])
def list_quizzes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return quiz_query(db).order_by(Quiz.created_at.desc()).all()


@router.get("/{quiz_id}", response_model=QuizResponse)
def get_quiz(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quiz = quiz_query(db).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz


@router.patch("/{quiz_id}", response_model=QuizResponse)
def update_quiz_route(
    quiz_id: int,
    payload: QuizUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("teacher", "admin")),
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if current_user.role == "teacher" and quiz.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own quizzes")
    try:
        updated = update_quiz(db, quiz, payload)
        return quiz_query(db).filter(Quiz.id == updated.id).first()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/{quiz_id}", response_model=QuizActionResponse)
def delete_quiz(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("teacher", "admin")),
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if current_user.role == "teacher" and quiz.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own quizzes")
    db.delete(quiz)
    db.commit()
    return QuizActionResponse(message="Quiz deleted successfully")


@router.post("/{quiz_id}/questions", response_model=QuizQuestionResponse)
def add_question_route(
    quiz_id: int,
    payload: QuizQuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("teacher", "admin")),
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if current_user.role == "teacher" and quiz.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only manage your own quiz questions")
    try:
        question = add_question(db, quiz, payload)
        return (
            db.query(QuizQuestion)
            .options(joinedload(QuizQuestion.options))
            .filter(QuizQuestion.id == question.id)
            .first()
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/{quiz_id}/start", response_model=QuizAttemptStartResponse)
def start_quiz_attempt(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("learner")),
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    try:
        attempt = start_attempt(db, quiz, current_user)
        return QuizAttemptStartResponse(
            attempt_id=attempt.id,
            message="Quiz attempt started successfully",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/{quiz_id}/attempts/{attempt_id}/submit", response_model=QuizAttemptResponse)
def submit_quiz_attempt(
    quiz_id: int,
    attempt_id: int,
    payload: QuizSubmissionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("learner")),
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    attempt = (
        db.query(QuizAttempt)
        .filter(
            QuizAttempt.id == attempt_id,
            QuizAttempt.quiz_id == quiz_id,
            QuizAttempt.learner_id == current_user.id,
        )
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=404, detail="Quiz attempt not found")
    try:
        return submit_attempt(db, quiz, attempt, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/{quiz_id}/attempts/mine", response_model=List[QuizAttemptResponse])
def my_quiz_attempts(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("learner")),
):
    return (
        db.query(QuizAttempt)
        .filter(
            QuizAttempt.quiz_id == quiz_id,
            QuizAttempt.learner_id == current_user.id,
        )
        .order_by(QuizAttempt.created_at.desc())
        .all()
    )