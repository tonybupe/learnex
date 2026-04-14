"""
Feed router - Smart feed with latest, popular, following, trending modes.
"""
from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func
from datetime import datetime, timedelta

from app.core.database import get_db
from app.deps import get_current_user
from app.models.post import Post
from app.models.post_reaction import PostReaction
from app.models.post_comment import PostComment
from app.models.post_attachment import PostAttachment
from app.models.user import User
from app.schemas.posts import PostResponse

router = APIRouter()


def base_post_query(db: Session):
    return db.query(Post).options(
        joinedload(Post.author).joinedload(User.profile),
        joinedload(Post.classroom),
        joinedload(Post.subject),
        joinedload(Post.attachments),
    )


def serialize_posts(db: Session, posts: list, current_user: User) -> list:
    """Reuse the existing to_post_response from posts route."""
    from app.api.v1.routes.posts import to_post_response
    result = []
    for p in posts:
        try:
            result.append(to_post_response(db, p, current_user))
        except Exception:
            pass
    return result


# ── LATEST ────────────────────────────────────────────────────────
@router.get("/latest", response_model=List[PostResponse])
def feed_latest(
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offset = (page - 1) * limit
    posts = (
        base_post_query(db)
        .filter(Post.status == "published")
        .order_by(desc(Post.created_at))
        .offset(offset).limit(limit).all()
    )
    return serialize_posts(db, posts, current_user)


# ── POPULAR ───────────────────────────────────────────────────────
@router.get("/popular", response_model=List[PostResponse])
def feed_popular(
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=50),
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offset = (page - 1) * limit
    since = datetime.utcnow() - timedelta(days=days)

    reaction_sq = (
        db.query(PostReaction.post_id, func.count(PostReaction.id).label("rc"))
        .group_by(PostReaction.post_id).subquery()
    )
    comment_sq = (
        db.query(PostComment.post_id, func.count(PostComment.id).label("cc"))
        .group_by(PostComment.post_id).subquery()
    )
    posts = (
        base_post_query(db)
        .outerjoin(reaction_sq, Post.id == reaction_sq.c.post_id)
        .outerjoin(comment_sq, Post.id == comment_sq.c.post_id)
        .filter(Post.status == "published", Post.created_at >= since)
        .order_by(desc(
            func.coalesce(reaction_sq.c.rc, 0) +
            func.coalesce(comment_sq.c.cc, 0) * 2
        ))
        .offset(offset).limit(limit).all()
    )
    return serialize_posts(db, posts, current_user)


# ── TRENDING ──────────────────────────────────────────────────────
@router.get("/trending", response_model=List[PostResponse])
def feed_trending(
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offset = (page - 1) * limit
    since = datetime.utcnow() - timedelta(days=3)

    reaction_sq = (
        db.query(PostReaction.post_id, func.count(PostReaction.id).label("rc"))
        .group_by(PostReaction.post_id).subquery()
    )
    comment_sq = (
        db.query(PostComment.post_id, func.count(PostComment.id).label("cc"))
        .group_by(PostComment.post_id).subquery()
    )
    posts = (
        base_post_query(db)
        .outerjoin(reaction_sq, Post.id == reaction_sq.c.post_id)
        .outerjoin(comment_sq, Post.id == comment_sq.c.post_id)
        .filter(Post.status == "published", Post.created_at >= since)
        .order_by(desc(
            func.coalesce(reaction_sq.c.rc, 0) * 3 +
            func.coalesce(comment_sq.c.cc, 0) * 5
        ))
        .offset(offset).limit(limit).all()
    )
    return serialize_posts(db, posts, current_user)


# ── FOLLOWING ─────────────────────────────────────────────────────
@router.get("/following", response_model=List[PostResponse])
def feed_following(
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offset = (page - 1) * limit
    try:
        from app.models.follow import Follow
        following_ids = (
            db.query(Follow.following_id)
            .filter(Follow.follower_id == current_user.id)
            .subquery()
        )
        posts = (
            base_post_query(db)
            .filter(Post.status == "published", Post.author_id.in_(following_ids))
            .order_by(desc(Post.created_at))
            .offset(offset).limit(limit).all()
        )
    except Exception:
        posts = []
    return serialize_posts(db, posts, current_user)


# ── MY CLASSES ────────────────────────────────────────────────────
@router.get("/classes", response_model=List[PostResponse])
def feed_classes(
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offset = (page - 1) * limit
    try:
        from app.models.class_member import ClassMember
        from app.models.class_room import ClassRoom
        taught = db.query(ClassRoom.id).filter(
            ClassRoom.teacher_id == current_user.id
        ).subquery()
        enrolled = db.query(ClassMember.class_id).filter(
            ClassMember.learner_id == current_user.id,
            ClassMember.status == "active"
        ).subquery()
        posts = (
            base_post_query(db)
            .filter(
                Post.status == "published",
                Post.class_id.isnot(None),
                (Post.class_id.in_(taught)) | (Post.class_id.in_(enrolled))
            )
            .order_by(desc(Post.created_at))
            .offset(offset).limit(limit).all()
        )
    except Exception:
        posts = []
    return serialize_posts(db, posts, current_user)