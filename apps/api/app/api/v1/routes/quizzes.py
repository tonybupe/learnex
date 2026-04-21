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
            notify_quiz_published(db, quiz, current_user)
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
        if payload.status == "published" and quiz.status != "published":
            notify_quiz_published(db, updated, current_user)
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
# ── AI QUIZ GENERATION ────────────────────────────────────────────────
from pydantic import BaseModel as PydanticBase

class AIQuizGenerateRequest(PydanticBase):
    lesson_id: int
    class_id: int
    subject_id: int
    title: str
    multiple_choice: int = 5
    true_false: int = 3
    short_answer: int = 2
    essay: int = 0
    difficulty: str = "medium"  # easy|medium|hard

class AIGradeRequest(PydanticBase):
    attempt_id: int
    question_id: int
    answer_text: str
    max_points: int

@router.post("/ai/generate", response_model=QuizResponse)
async def ai_generate_quiz(
    payload: AIQuizGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("teacher")),
):
    """Generate a full quiz with questions from lesson content using Claude AI."""
    import os, anthropic
    from app.models.lesson import Lesson

    lesson = db.query(Lesson).filter(Lesson.id == payload.lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI service not configured")

    # Build prompt
    content = lesson.content or lesson.description or lesson.title
    prompt = f"""You are an expert educator creating a quiz based on lesson content.

LESSON TITLE: {lesson.title}
LESSON CONTENT:
{content[:4000]}

Generate a quiz with EXACTLY:
- {payload.multiple_choice} multiple choice questions (question_type: "single_choice")
- {payload.true_false} true/false questions (question_type: "true_false")
- {payload.short_answer} short answer questions (question_type: "short_text")
- {payload.essay} essay questions (question_type: "short_text")

Difficulty level: {payload.difficulty}

Return ONLY valid JSON in this exact format:
{{
  "questions": [
    {{
      "question_text": "Question here?",
      "question_type": "single_choice",
      "points": 2,
      "options": [
        {{"option_text": "Option A", "is_correct": true}},
        {{"option_text": "Option B", "is_correct": false}},
        {{"option_text": "Option C", "is_correct": false}},
        {{"option_text": "Option D", "is_correct": false}}
      ]
    }},
    {{
      "question_text": "True or False: statement here",
      "question_type": "true_false",
      "points": 1,
      "options": [
        {{"option_text": "True", "is_correct": true}},
        {{"option_text": "False", "is_correct": false}}
      ]
    }},
    {{
      "question_text": "Short answer question?",
      "question_type": "short_text",
      "points": 3,
      "options": []
    }}
  ]
}}

Rules:
- Multiple choice must have exactly 4 options with exactly 1 correct
- True/False must have exactly 2 options (True/False)
- Short text/essay have empty options array
- Points: multiple_choice=2, true_false=1, short_answer=3, essay=5
- Make questions specific to the lesson content
- Return ONLY JSON, no markdown, no explanation"""

    try:
        client = anthropic.Anthropic(api_key=api_key)
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = msg.content[0].text.strip()
        # Clean JSON
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        import json
        data = json.loads(raw.strip())
        questions_data = data.get("questions", [])
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI generation failed: {str(e)}")

    # Create quiz
    from app.services.quiz_service import create_quiz as svc_create
    from app.schemas.quizzes import QuizCreate as QC
    quiz = svc_create(db, current_user, QC(
        class_id=payload.class_id,
        subject_id=payload.subject_id,
        lesson_id=payload.lesson_id,
        title=payload.title,
        description=f"AI-generated quiz from: {lesson.title}",
        assessment_type="quiz",
        status="draft",
        is_auto_marked=True,
    ))

    # Add questions
    from app.services.quiz_service import add_question as svc_add_q
    from app.schemas.quizzes import QuizQuestionCreate, QuizOptionCreate
    for i, q in enumerate(questions_data):
        opts = [QuizOptionCreate(option_text=o["option_text"], is_correct=o["is_correct"]) for o in q.get("options", [])]
        svc_add_q(db, quiz, QuizQuestionCreate(
            question_text=q["question_text"],
            question_type=q["question_type"],
            points=q.get("points", 2),
            order_index=i + 1,
            is_required=True,
            options=opts,
        ))

    return quiz_query(db).filter(Quiz.id == quiz.id).first()


@router.post("/{quiz_id}/attempts/{attempt_id}/ai-grade")
async def ai_grade_attempt(
    quiz_id: int,
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("teacher", "admin")),
):
    """AI grades short answer and essay questions in a submitted attempt."""
    import os, anthropic, json
    from app.models.quiz_answer import QuizAnswer

    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    attempt = db.query(QuizAttempt).filter(
        QuizAttempt.id == attempt_id,
        QuizAttempt.quiz_id == quiz_id,
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    # Get ungraded text answers
    answers = db.query(QuizAnswer).filter(
        QuizAnswer.attempt_id == attempt_id,
        QuizAnswer.answer_text != None,
        QuizAnswer.is_correct == None,
    ).all()

    if not answers:
        return {"message": "No ungraded answers found", "graded": 0}

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI service not configured")

    client = anthropic.Anthropic(api_key=api_key)
    graded = 0
    total_awarded = 0.0

    for answer in answers:
        question = db.query(QuizQuestion).filter(QuizQuestion.id == answer.question_id).first()
        if not question:
            continue

        # Get lesson context
        lesson = None
        if quiz.lesson_id:
            from app.models.lesson import Lesson
            lesson = db.query(Lesson).filter(Lesson.id == quiz.lesson_id).first()

        lesson_context = f"\nLesson context: {(lesson.content or '')[:1000]}" if lesson else ""

        prompt = f"""You are an expert teacher grading a student answer.

Question: {question.question_text}
Max points: {question.points}
Student answer: {answer.answer_text}
{lesson_context}

Grade this answer and return ONLY JSON:
{{
  "points_awarded": <number between 0 and {question.points}>,
  "is_correct": <true if full marks, false otherwise>,
  "feedback": "<brief constructive feedback in 1 sentence>"
}}"""

        try:
            msg = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}]
            )
            raw = msg.content[0].text.strip()
            if "```" in raw:
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            result = json.loads(raw.strip())
            answer.points_awarded = float(result.get("points_awarded", 0))
            answer.is_correct = result.get("is_correct", False)
            graded += 1
            total_awarded += answer.points_awarded
        except Exception:
            pass

    # Recalculate attempt score
    all_answers = db.query(QuizAnswer).filter(QuizAnswer.attempt_id == attempt_id).all()
    total_score = sum(a.points_awarded or 0 for a in all_answers)
    attempt.score = total_score
    attempt.percentage = (total_score / attempt.max_score * 100) if attempt.max_score else 0
    attempt.status = "graded"

    db.commit()
    return {"message": f"Graded {graded} answers", "graded": graded, "total_score": total_score, "percentage": attempt.percentage}


@router.get("/{quiz_id}/attempts", response_model=List[QuizAttemptResponse])
def list_quiz_attempts(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("teacher", "admin")),
):
    """Teacher views all attempts for a quiz."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if current_user.role == "teacher" and quiz.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz_id).order_by(QuizAttempt.created_at.desc()).all()

@router.get("/{quiz_id}/attempts/{attempt_id}/answers")
def get_attempt_answers(
    quiz_id: int,
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("teacher", "admin")),
):
    """Get all answers for a specific attempt."""
    from app.models.quiz_answer import QuizAnswer
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if current_user.role == "teacher" and quiz.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    answers = db.query(QuizAnswer).filter(QuizAnswer.attempt_id == attempt_id).all()
    return [{"id": a.id, "question_id": a.question_id, "selected_option_id": a.selected_option_id,
             "answer_text": a.answer_text, "is_correct": a.is_correct, "points_awarded": a.points_awarded} for a in answers]