from datetime import datetime, timezone
from sqlalchemy.orm import Session, joinedload

from app.models.class_member import ClassMember
from app.models.class_room import ClassRoom
from app.models.lesson import Lesson
from app.models.quiz import Quiz
from app.models.quiz_answer import QuizAnswer
from app.models.quiz_attempt import QuizAttempt
from app.models.quiz_option import QuizOption
from app.models.quiz_question import QuizQuestion
from app.models.subject import Subject
from app.models.user import User
from app.schemas.quizzes import QuizCreate, QuizQuestionCreate, QuizSubmissionRequest, QuizUpdate


def create_quiz(db: Session, teacher: User, payload: QuizCreate) -> Quiz:
    if teacher.role != "teacher":
        raise ValueError("Only teachers can create quizzes")

    classroom = db.query(ClassRoom).filter(ClassRoom.id == payload.class_id).first()
    if not classroom:
        raise ValueError("Class not found")
    if classroom.teacher_id != teacher.id:
        raise ValueError("You can only create quizzes for your own classes")

    subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not subject:
        raise ValueError("Subject not found")

    if payload.lesson_id is not None:
        lesson = db.query(Lesson).filter(Lesson.id == payload.lesson_id).first()
        if not lesson:
            raise ValueError("Lesson not found")

    quiz = Quiz(
        class_id=payload.class_id,
        subject_id=payload.subject_id,
        lesson_id=payload.lesson_id,
        teacher_id=teacher.id,
        title=payload.title,
        description=payload.description,
        assessment_type=payload.assessment_type,
        status=payload.status,
        time_limit_minutes=payload.time_limit_minutes,
        attempts_allowed=payload.attempts_allowed,
        is_auto_marked=payload.is_auto_marked,
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)
    return quiz


def update_quiz(db: Session, quiz: Quiz, payload: QuizUpdate) -> Quiz:
    if payload.title is not None:
        quiz.title = payload.title
    if payload.description is not None:
        quiz.description = payload.description
    if payload.assessment_type is not None:
        quiz.assessment_type = payload.assessment_type
    if payload.status is not None:
        quiz.status = payload.status
    if payload.time_limit_minutes is not None:
        quiz.time_limit_minutes = payload.time_limit_minutes
    if payload.attempts_allowed is not None:
        quiz.attempts_allowed = payload.attempts_allowed
    if payload.is_auto_marked is not None:
        quiz.is_auto_marked = payload.is_auto_marked

    db.commit()
    db.refresh(quiz)
    return quiz


def add_question(db: Session, quiz: Quiz, payload: QuizQuestionCreate) -> QuizQuestion:
    question = QuizQuestion(
        quiz_id=quiz.id,
        question_text=payload.question_text,
        question_type=payload.question_type,
        points=payload.points,
        order_index=payload.order_index,
        is_required=payload.is_required,
    )
    db.add(question)
    db.flush()

    for option in payload.options:
        db.add(
            QuizOption(
                question_id=question.id,
                option_text=option.option_text,
                is_correct=option.is_correct,
            )
        )

    db.commit()
    db.refresh(question)
    return question


def start_attempt(db: Session, quiz: Quiz, learner: User) -> QuizAttempt:
    if learner.role != "learner":
        raise ValueError("Only learners can attempt quizzes")

    membership = (
        db.query(ClassMember)
        .filter(
            ClassMember.class_id == quiz.class_id,
            ClassMember.learner_id == learner.id,
            ClassMember.status == "active",
        )
        .first()
    )
    if not membership:
        raise ValueError("Learner must belong to the class to attempt this quiz")

    existing_count = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.quiz_id == quiz.id, QuizAttempt.learner_id == learner.id)
        .count()
    )

    if existing_count >= quiz.attempts_allowed:
        raise ValueError("Maximum attempts reached")

    attempt = QuizAttempt(
        quiz_id=quiz.id,
        learner_id=learner.id,
        status="in_progress",
        started_at=datetime.now(timezone.utc),
        attempt_number=existing_count + 1,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt


def submit_attempt(db: Session, quiz: Quiz, attempt: QuizAttempt, payload: QuizSubmissionRequest) -> QuizAttempt:
    if attempt.status != "in_progress":
        raise ValueError("Attempt is not in progress")

    questions = (
        db.query(QuizQuestion)
        .options(joinedload(QuizQuestion.options))
        .filter(QuizQuestion.quiz_id == quiz.id)
        .all()
    )
    question_map = {q.id: q for q in questions}

    total_score = 0.0
    max_score = 0.0

    for question in questions:
        max_score += float(question.points)

    for item in payload.answers:
        question = question_map.get(item.question_id)
        if not question:
            raise ValueError(f"Invalid question id {item.question_id}")

        selected_option = None
        is_correct = None
        points_awarded = 0.0

        if item.selected_option_id is not None:
            selected_option = (
                db.query(QuizOption)
                .filter(
                    QuizOption.id == item.selected_option_id,
                    QuizOption.question_id == question.id,
                )
                .first()
            )
            if not selected_option:
                raise ValueError(f"Invalid selected option for question {question.id}")

        if question.question_type in {"single_choice", "true_false"}:
            is_correct = bool(selected_option and selected_option.is_correct)
            points_awarded = float(question.points) if is_correct else 0.0

        elif question.question_type == "multiple_choice":
            is_correct = bool(selected_option and selected_option.is_correct)
            points_awarded = float(question.points) if is_correct else 0.0

        elif question.question_type == "short_text":
            is_correct = None
            points_awarded = 0.0

        answer = QuizAnswer(
            attempt_id=attempt.id,
            question_id=question.id,
            selected_option_id=item.selected_option_id,
            answer_text=item.answer_text,
            is_correct=is_correct,
            points_awarded=points_awarded,
        )
        db.add(answer)
        total_score += points_awarded

    attempt.status = "submitted" if not quiz.is_auto_marked else "graded"
    attempt.submitted_at = datetime.now(timezone.utc)
    attempt.score = total_score
    attempt.max_score = max_score
    attempt.percentage = (total_score / max_score * 100.0) if max_score > 0 else 0.0

    db.commit()
    db.refresh(attempt)
    return attempt