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
        # Verify teacher owns the class they are creating a lesson for
        if current_user.role == "teacher":
            from app.models.class_room import ClassRoom
            cls = db.query(ClassRoom).filter(ClassRoom.id == payload.class_id).first()
            if not cls:
                raise HTTPException(status_code=404, detail="Class not found")
            if cls.teacher_id != current_user.id:
                raise HTTPException(status_code=403, detail="You can only create lessons in your own classes")
        lesson = create_lesson(db, current_user, payload)
        if lesson.status == "published":
            notify_lesson_published(db, lesson.id, current_user, lesson.class_id, lesson.title)
        return lesson_query(db).filter(Lesson.id == lesson.id).first()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("", response_model=List[LessonResponse])
def list_lessons(
    mine: bool = False,
    class_id: int = None,
    visibility: str = None,
    lesson_type: str = None,
    status: str = None,
    search: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = lesson_query(db)
    # Get enrolled class IDs for any role (teachers can join classes too)
    from app.models.class_member import ClassMember
    enrolled_class_ids = db.query(ClassMember.class_id).filter(
        ClassMember.learner_id == current_user.id,
        ClassMember.status == "active"
    ).subquery()

    if current_user.role == "teacher" or current_user.role == "admin":
        if mine:
            # mine=true: only own lessons
            q = q.filter(Lesson.teacher_id == current_user.id)
        else:
            # Show: own lessons + lessons in joined classes (published) + public lessons
            q = q.filter(
                (Lesson.teacher_id == current_user.id) |
                (Lesson.class_id.in_(enrolled_class_ids) & (Lesson.status == "published")) |
                (Lesson.visibility == "public")
            )
    elif current_user.role == "learner":
        # Learners: published lessons in enrolled classes + public lessons
        q = q.filter(
            (Lesson.visibility == "public") |
            (Lesson.class_id.in_(enrolled_class_ids))
        ).filter(Lesson.status == "published")
    if class_id:
        q = q.filter(Lesson.class_id == class_id)
    if visibility:
        q = q.filter(Lesson.visibility == visibility)
    if lesson_type:
        q = q.filter(Lesson.lesson_type == lesson_type)
    if status:
        q = q.filter(Lesson.status == status)
    if search:
        q = q.filter(Lesson.title.ilike(f"%{search}%"))
    return q.order_by(Lesson.created_at.desc()).all()


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

# =========================================================
# AI LESSON GENERATOR
# =========================================================
from pydantic import BaseModel as PydanticBaseModel

class AIGenerateRequest(PydanticBaseModel):
    topic: str
    subtopic: str = ""
    level: str = "secondary"  # primary, secondary, college, university

@router.post("/ai/generate")
async def generate_lesson_with_ai(
    payload: AIGenerateRequest,
    current_user: User = Depends(require_roles("teacher", "admin")),
):
    """Generate full lesson content using Claude AI."""
    import os
    import anthropic

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI service not configured")

    level_desc = {
        "primary": "primary school students (ages 6-12), use simple language and fun examples",
        "secondary": "secondary school students (ages 13-18), use clear explanations with real-world examples",
        "college": "college students, use intermediate academic language with detailed explanations",
        "university": "university students, use advanced academic language with in-depth analysis",
    }.get(payload.level, "secondary school students")

    subtopic_part = f" focusing on '{payload.subtopic}'" if payload.subtopic.strip() else ""

    prompt = f"""You are a highly experienced educator and curriculum designer. Your task is to write a COMPLETE, DETAILED, and ENGAGING lesson for {level_desc}.

Topic: {payload.topic}{subtopic_part}

Write the lesson AS IF you are writing a textbook chapter. Be thorough, detailed, and educational.

Return a JSON object with these exact fields:

{{
  "content": "IMPORTANT: Use only - for bullet points, never use • or * characters.\\n\\n## Introduction\\n\\nWrite 2-3 paragraphs introducing {payload.topic}, why it matters, and what students will learn.\\n\\n## Background\\n\\nProvide historical context or foundational knowledge needed to understand this topic. Write at least 2 detailed paragraphs.\\n\\n## Core Concepts\\n\\nExplain EACH major concept in detail. For each concept:\\n- Define it clearly\\n- Explain how it works\\n- Give a concrete example\\nWrite at least 3-4 paragraphs covering all main concepts.\\n\\n## How It Works (Detailed Explanation)\\n\\nGive a step-by-step or process-based explanation. Use bullet points and numbered lists where helpful. Write at least 3 paragraphs.\\n\\n## Real-World Examples\\n\\nProvide 3-4 specific, relatable real-world examples or applications. Each example should be 1-2 paragraphs.\\n\\n## Common Misconceptions\\n\\nAddress 2-3 common misunderstandings about this topic and correct them.\\n\\n## Key Takeaways\\n\\n- List 5-7 most important points students must remember\\n\\n## Practice Questions\\n\\n1. [Question testing basic understanding]\\n2. [Question testing application]\\n3. [Question testing analysis]\\n4. [Question testing synthesis]\\n5. [Challenge question]\\n\\nNOTE: The content field must be at least 800 words of actual educational text.",
  "summary": "Write a clear 3-4 sentence summary of what this lesson covers and the most important things to remember about {payload.topic}.",
  "key_terms": [
    {{"term": "exact term", "definition": "precise, clear definition in simple language"}},
    {{"term": "exact term", "definition": "precise, clear definition in simple language"}},
    {{"term": "exact term", "definition": "precise, clear definition in simple language"}},
    {{"term": "exact term", "definition": "precise, clear definition in simple language"}},
    {{"term": "exact term", "definition": "precise, clear definition in simple language"}},
    {{"term": "exact term", "definition": "precise, clear definition in simple language"}},
    {{"term": "exact term", "definition": "precise, clear definition in simple language"}}
  ],
  "youtube_searches": [
    "{payload.topic} explained for beginners",
    "{payload.topic} detailed tutorial",
    "{payload.topic} real world examples",
    "{payload.topic} for {payload.level} students"
  ],
  "presentation_slides": [
    {{"slide": 1, "title": "Introduction to {payload.topic}", "points": ["What is {payload.topic}?", "Why does it matter?", "What we will learn today"]}},
    {{"slide": 2, "title": "Core Concepts", "points": ["First major concept", "Second major concept", "Third major concept"]}},
    {{"slide": 3, "title": "How It Works", "points": ["Step 1", "Step 2", "Step 3", "Step 4"]}},
    {{"slide": 4, "title": "Real World Examples", "points": ["Example 1", "Example 2", "Example 3"]}},
    {{"slide": 5, "title": "Key Takeaways", "points": ["Most important point 1", "Most important point 2", "Most important point 3", "Remember this!"]}},
    {{"slide": 6, "title": "Practice & Review", "points": ["Question 1", "Question 2", "Further reading"]}}
  ]
}}

CRITICAL INSTRUCTIONS:
1. Return ONLY the JSON object. No markdown code blocks. No extra text before or after.
2. The "content" field must contain REAL, DETAILED educational content - not placeholders.
3. Write as an expert teacher explaining to students, not as an AI summarizing.
4. All content must be specific to "{payload.topic}" - no generic filler text.
5. Minimum 800 words in the content field.
6. Use ONLY hyphen (-) for bullet points. Never use bullet character (•) or asterisk (*).
7. For presentation_slides points field, write REAL specific content about {payload.topic}, not generic placeholders like "Core principle 1" or "Example 1"."""

    import json

    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}]
        )

        raw = message.content[0].text.strip()

        # Extract JSON from code fences if present
        if "```" in raw:
            parts = raw.split("```")
            for part in parts:
                if part.startswith("json"):
                    raw = part[4:].strip()
                    break
                elif "{" in part and "content" in part:
                    raw = part.strip()
                    break

        raw = raw.strip()

        # Fix missing opening brace
        if not raw.startswith("{") and "content" in raw:
            raw = "{" + raw

        # Truncate to last closing brace
        if not raw.endswith("}"):
            last = raw.rfind("}")
            if last > 0:
                raw = raw[:last + 1]

        data = json.loads(raw)

        if not data.get("content") or len(data["content"]) < 100:
            raise ValueError("AI returned insufficient content")

        return data

    except anthropic.BadRequestError as e:
        err_msg = str(e)
        if "credit" in err_msg.lower() or "balance" in err_msg.lower():
            raise HTTPException(
                status_code=402,
                detail="AI credits exhausted. Please top up your Anthropic account at console.anthropic.com to use AI generation."
            )
        raise HTTPException(status_code=400, detail=f"AI request error: {err_msg}")
    except anthropic.APIError as e:
        raise HTTPException(status_code=503, detail=f"AI service unavailable: {str(e)}")
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"AI returned invalid response format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")