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
# =========================================================
# AI LESSON CONTENT GENERATOR
# =========================================================

@router.post("/ai/generate")
def generate_lesson_content(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("teacher", "admin")),
):
    topic = payload.get("topic", "").strip()
    if not topic:
        raise HTTPException(status_code=400, detail="Topic is required")

    def make_fallback(t: str) -> dict:
        slug = t.replace(" ", "_")
        query = t.replace(" ", "+")
        return {
            "content": (
                f"## Introduction to {t}\n\n"
                f"This lesson covers the fundamental concepts of **{t}**.\n\n"
                f"## Key Concepts\n\n"
                f"- Definition and overview of {t}\n"
                f"- Historical background and context\n"
                f"- Core principles and theories\n"
                f"- Real-world applications\n"
                f"- Common misconceptions\n\n"
                f"## Main Content\n\n"
                f"### What is {t}?\n\n"
                f"{t} is an important concept that forms the foundation of understanding in this field.\n\n"
                f"### Why is it Important?\n\n"
                f"Understanding {t} helps learners:\n"
                f"- Build critical thinking skills\n"
                f"- Apply knowledge to real situations\n"
                f"- Connect theory with practice\n"
                f"- Develop deeper subject mastery\n\n"
                f"## Summary\n\n"
                f"In this lesson, we explored the key aspects of {t}. "
                f"Students should now have a foundational understanding and be ready to explore more advanced concepts.\n\n"
                f"## Review Questions\n\n"
                f"1. What is the main concept behind {t}?\n"
                f"2. How does {t} apply in real-world scenarios?\n"
                f"3. What are the key principles you learned today?"
            ),
            "summary": f"An introduction to {t} covering key concepts, principles and real-world applications.",
            "youtube_searches": [
                f"{t} explained",
                f"{t} tutorial for beginners",
                f"{t} examples and applications",
            ],
            "resource_links": [
                {"title": f"Wikipedia: {t}", "url": f"https://en.wikipedia.org/wiki/{slug}", "type": "article"},
                {"title": f"Khan Academy: {t}", "url": f"https://www.khanacademy.org/search?page_search_query={query}", "type": "course"},
                {"title": f"YouTube: {t} Explained", "url": f"https://www.youtube.com/results?search_query={query}+explained", "type": "video"},
            ],
        }

    try:
        import os
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not api_key or api_key == "your-anthropic-api-key-here":
            return make_fallback(topic)

        import anthropic as _anthropic
        client = _anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=1500,
            messages=[{
                "role": "user",
                "content": (
                    f'You are an expert educator. Generate structured lesson content for: "{topic}".\n\n'
                    'Return ONLY valid JSON, no markdown, no backticks:\n'
                    '{"content":"lesson with ## headings, - bullets, **bold** terms, 400+ words",'
                    '"summary":"one sentence",'
                    '"youtube_searches":["query1","query2","query3"],'
                    '"resource_links":[{"title":"name","url":"https://...","type":"article"}]}'
                )
            }]
        )
        import json
        text = message.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        return json.loads(text)

    except Exception as e:
        err = str(e)
        if any(w in err.lower() for w in ["credit", "billing", "quota", "insufficient"]):
            return make_fallback(topic)
        raise HTTPException(status_code=500, detail=f"AI generation failed: {err}")


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