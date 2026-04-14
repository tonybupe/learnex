from typing import List
import json
import os

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.deps import get_current_user, require_roles
from app.models.lesson import Lesson
from app.models.lesson_discussion import LessonDiscussion
from app.models.user import User
from app.schemas.lessons import (
    LessonCreate, LessonResourceCreate, LessonResourceResponse,
    LessonResponse, LessonUpdate,
)
from app.services.notification_service import notify_lesson_published
from app.services.lesson_service import add_lesson_resource, create_lesson, update_lesson

router = APIRouter()


def lesson_query(db: Session):
    return db.query(Lesson).options(joinedload(Lesson.resources))


# =========================================================
# CRUD
# =========================================================

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
# AI LESSON CONTENT GENERATOR
# =========================================================

def make_fallback(topic: str) -> dict:
    slug = topic.replace(" ", "_")
    query = topic.replace(" ", "+")
    return {
        "content": (
            f"## {topic}\n\n"
            f"**Overview:** This lesson introduces the key concepts of {topic}.\n\n"
            f"## Learning Objectives\n\n"
            f"By the end of this lesson, learners will be able to:\n"
            f"- Define and explain {topic}\n"
            f"- Identify the core principles of {topic}\n"
            f"- Apply {topic} concepts to real-world situations\n"
            f"- Analyze examples and case studies related to {topic}\n\n"
            f"## Key Concepts\n\n"
            f"### 1. Introduction\n\n"
            f"{topic} is a fundamental concept that plays an important role in this field of study. "
            f"Understanding it helps learners develop critical thinking and problem-solving skills.\n\n"
            f"### 2. Core Principles\n\n"
            f"- **Principle 1:** Foundation of {topic} — the basic building blocks\n"
            f"- **Principle 2:** Application — how {topic} is used in practice\n"
            f"- **Principle 3:** Analysis — breaking down {topic} into components\n"
            f"- **Principle 4:** Synthesis — combining ideas related to {topic}\n\n"
            f"### 3. Real-World Applications\n\n"
            f"{topic} can be observed in many real-world contexts:\n"
            f"1. In everyday life — examples students can relate to\n"
            f"2. In professional settings — career relevance\n"
            f"3. In scientific research — academic importance\n\n"
            f"## Summary\n\n"
            f"In this lesson, we explored {topic} from multiple angles. "
            f"Students should now have a foundational understanding and be ready for deeper study.\n\n"
            f"## Review Questions\n\n"
            f"1. What is {topic} and why is it important?\n"
            f"2. List three real-world applications of {topic}.\n"
            f"3. How does {topic} connect to what you already know?\n"
            f"4. What questions do you still have about {topic}?"
        ),
        "summary": f"A comprehensive introduction to {topic} covering objectives, core principles, applications and review.",
        "key_terms": [
            {"term": topic, "definition": f"The main subject of this lesson"},
            {"term": "Analysis", "definition": "Breaking down a concept into its components"},
            {"term": "Application", "definition": "Using knowledge in practical situations"},
        ],
        "youtube_searches": [
            f"{topic} explained simply",
            f"{topic} tutorial for students",
            f"{topic} real world examples",
            f"{topic} animated explanation",
        ],
        "image_searches": [
            f"{topic} diagram",
            f"{topic} infographic",
            f"{topic} illustration",
        ],
        "resource_links": [
            {"title": f"Wikipedia: {topic}", "url": f"https://en.wikipedia.org/wiki/{slug}", "type": "article"},
            {"title": f"Khan Academy: {topic}", "url": f"https://www.khanacademy.org/search?page_search_query={query}", "type": "course"},
            {"title": f"YouTube: {topic}", "url": f"https://www.youtube.com/results?search_query={query}+explained", "type": "video"},
            {"title": f"Google Images: {topic}", "url": f"https://www.google.com/search?tbm=isch&q={query}+diagram", "type": "images"},
        ],
        "diagram_suggestions": [
            f"Concept map of {topic}",
            f"Timeline of {topic} development",
            f"Flowchart showing {topic} process",
        ],
        "presentation_slides": [
            {"slide": 1, "title": f"Introduction to {topic}", "points": [f"What is {topic}?", "Why it matters", "Today's learning goals"]},
            {"slide": 2, "title": "Key Concepts", "points": ["Core principle 1", "Core principle 2", "Core principle 3"]},
            {"slide": 3, "title": "Real-World Applications", "points": ["Example 1", "Example 2", "Case study"]},
            {"slide": 4, "title": "Summary & Review", "points": ["Key takeaways", "Review questions", "Next steps"]},
        ],
    }


@router.post("/ai/generate")
def generate_lesson_content(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("teacher", "admin")),
):
    topic = payload.get("topic", "").strip()
    subtopic = payload.get("subtopic", "").strip()
    level = payload.get("level", "secondary").strip()
    if not topic:
        raise HTTPException(status_code=400, detail="Topic is required")

    full_topic = f"{topic}: {subtopic}" if subtopic else topic

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key or api_key == "your-anthropic-api-key-here":
        return make_fallback(full_topic)

    try:
        import anthropic as _anthropic
        client = _anthropic.Anthropic(api_key=api_key)
        prompt = f"""You are an expert educator creating a lesson for {level} school students on: "{full_topic}".

Return ONLY a valid JSON object (no markdown, no backticks, no extra text):
{{
  "content": "Full lesson notes with ## headings, ### subheadings, - bullet points, **bold key terms**, numbered lists, and clear explanations. At least 600 words. Include an introduction, learning objectives, key concepts with explanations, real-world examples, and a summary.",
  "summary": "One paragraph summary of the lesson",
  "key_terms": [
    {{"term": "term1", "definition": "clear definition"}},
    {{"term": "term2", "definition": "clear definition"}},
    {{"term": "term3", "definition": "clear definition"}}
  ],
  "youtube_searches": ["specific search query 1", "specific search query 2", "specific search query 3", "specific search query 4"],
  "image_searches": ["diagram search 1", "diagram search 2", "infographic search"],
  "resource_links": [
    {{"title": "Resource name", "url": "https://actual-url.com", "type": "article"}},
    {{"title": "Khan Academy link", "url": "https://www.khanacademy.org/search?page_search_query={full_topic.replace(' ', '+')}", "type": "course"}},
    {{"title": "YouTube search", "url": "https://www.youtube.com/results?search_query={full_topic.replace(' ', '+')}", "type": "video"}}
  ],
  "diagram_suggestions": ["Concept map showing...", "Flowchart of...", "Timeline of..."],
  "presentation_slides": [
    {{"slide": 1, "title": "Introduction", "points": ["point1", "point2", "point3"]}},
    {{"slide": 2, "title": "Key Concepts", "points": ["point1", "point2", "point3"]}},
    {{"slide": 3, "title": "Applications", "points": ["point1", "point2", "point3"]}},
    {{"slide": 4, "title": "Summary", "points": ["takeaway1", "takeaway2", "takeaway3"]}}
  ]
}}"""

        message = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        text = message.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        return json.loads(text)

    except Exception as e:
        err = str(e)
        if any(w in err.lower() for w in ["credit", "billing", "quota", "insufficient", "overloaded"]):
            return make_fallback(full_topic)
        raise HTTPException(status_code=500, detail=f"AI generation failed: {err}")


# =========================================================
# LESSON DISCUSSION
# =========================================================

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
            "id": c.id, "content": c.content,
            "user_id": c.user_id, "lesson_id": c.lesson_id,
            "created_at": c.created_at,
            "author": {"id": author.id, "full_name": author.full_name, "role": author.role} if author else None,
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
    comment = LessonDiscussion(lesson_id=lesson_id, user_id=current_user.id, content=content)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return {
        "id": comment.id, "content": comment.content,
        "user_id": comment.user_id, "lesson_id": comment.lesson_id,
        "created_at": comment.created_at,
        "author": {"id": current_user.id, "full_name": current_user.full_name, "role": current_user.role},
    }


@router.delete("/{lesson_id}/discussion/{comment_id}")
def delete_lesson_comment(
    lesson_id: int, comment_id: int,
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