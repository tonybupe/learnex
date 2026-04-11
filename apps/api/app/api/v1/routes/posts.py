# app/routers/posts.py
"""
Posts router - Handles all post-related operations with WebSocket broadcasting.
"""

import asyncio
import os
import shutil
import logging
import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc

from app.core.config import settings
from app.core.database import get_db
from app.deps import get_current_user

from app.models.media_file import MediaFile
from app.models.post import Post
from app.models.post_comment import PostComment
from app.models.post_reaction import PostReaction
from app.models.saved_post import SavedPost
from app.models.user import User
from app.models.post_attachment import PostAttachment

from app.schemas.posts import (
    PostActionResponse,
    PostCommentCreate,
    PostCommentResponse,
    PostCreate,
    PostReactionCreate,
    PostResponse,
    PostUpdate,
    PaginatedPostResponse,
    PostListParams,
    PostAttachmentResponse,
)

from app.services.notification_service import notify_class_post
from app.services.post_service import (
    add_comment,
    add_or_update_reaction,
    can_view_post,
    create_post,
    remove_reaction,
    save_post,
    unsave_post,
    update_post,
)

# WebSocket manager for real-time updates
from app.websocket import manager

logger = logging.getLogger(__name__)

router = APIRouter()
UPLOAD_DIR = settings.upload_dir


# =========================================================
# 🔧 HELPER FUNCTIONS
# =========================================================

def author_to_dict(author: User) -> Dict[str, Any]:
    """Convert User model to dictionary for response."""
    author_dict = {
        'id': author.id,
        'full_name': author.full_name,
        'email': author.email,
        'role': author.role,
        'profile': None
    }
    
    if author.profile:
        author_dict['profile'] = {
            'avatar_url': author.profile.avatar_url,
            'bio': author.profile.bio,
            'location': author.profile.location,
            'website': author.profile.website,
        }
    
    return author_dict


def attachment_to_dict(attachment: PostAttachment) -> Dict[str, Any]:
    """Convert PostAttachment model to dictionary for response."""
    return {
        'id': attachment.id,
        'media_file_id': attachment.media_file_id,
        'attachment_type': attachment.attachment_type,
        'file_url': attachment.file_url,
        'file_name': attachment.file_name,
        'mime_type': attachment.mime_type,
        'created_at': attachment.created_at,
        'updated_at': attachment.updated_at,
    }


def post_query(db: Session):
    """Base query for posts with eager loading of relations."""
    return db.query(Post).options(
        joinedload(Post.author).joinedload(User.profile),
        joinedload(Post.classroom),
        joinedload(Post.subject),
        joinedload(Post.attachments),
    )


def comment_query(db: Session):
    """Base query for comments with eager loading of relations."""
    return db.query(PostComment).options(
        joinedload(PostComment.author).joinedload(User.profile)
    )


def to_post_response(db: Session, post: Post, current_user: Optional[User] = None) -> PostResponse:
    """Convert Post model to PostResponse schema with user-specific state."""
    # Get counts
    reactions_count = db.query(PostReaction).filter(PostReaction.post_id == post.id).count()
    comments_count = db.query(PostComment).filter(PostComment.post_id == post.id).count()
    saves_count = db.query(SavedPost).filter(SavedPost.post_id == post.id).count()
    
    # Check if current user has liked/saved the post
    is_liked = False
    is_saved = False
    
    if current_user:
        reaction = db.query(PostReaction).filter(
            PostReaction.post_id == post.id,
            PostReaction.user_id == current_user.id  
        ).first()
        is_liked = reaction is not None
        
        saved = db.query(SavedPost).filter(
            SavedPost.post_id == post.id,
            SavedPost.user_id == current_user.id  
        ).first()
        is_saved = saved is not None
    
    # Convert attachments to dictionaries
    attachments = [attachment_to_dict(att) for att in post.attachments]
    
    # Convert author to dictionary
    author_dict = author_to_dict(post.author)
    
    return PostResponse(
        id=post.id,
        post_type=post.post_type,
        visibility=post.visibility,
        title=post.title,
        content=post.content,
        status=post.status,
        author=author_dict,
        classroom=post.classroom,
        subject=post.subject,
        attachments=attachments,
        reactions_count=reactions_count,
        comments_count=comments_count,
        saves_count=saves_count,
        created_at=post.created_at,
        updated_at=post.updated_at,
    )


def to_comment_response(comment: PostComment) -> Dict[str, Any]:
    """Convert Comment model to response dictionary."""
    author_dict = author_to_dict(comment.author)
    
    return {
        'id': comment.id,
        'post_id': comment.post_id,
        'author': author_dict,
        'content': comment.content,
        'created_at': comment.created_at,
        'updated_at': comment.updated_at,
    }


async def broadcast_to_class(class_id: int, message: dict) -> None:
    """Helper to broadcast WebSocket messages to a class."""
    if class_id:
        try:
            await manager.send_to_class(class_id, message)
        except Exception as e:
            logger.error(f"Failed to broadcast to class {class_id}: {e}")


def validate_file(file: UploadFile, max_size_mb: int = 10) -> None:
    """Validate uploaded file size and type."""
    if file.size and file.size > max_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Max size: {max_size_mb}MB"
        )
    
    allowed_types = [
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "video/mp4", "video/quicktime", "video/x-msvideo"
    ]
    
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
        )


def determine_media_type(content_type: str) -> str:
    """Determine media type from content type."""
    if content_type.startswith('image/'):
        return 'image'
    elif content_type.startswith('video/'):
        return 'video'
    elif content_type.startswith('audio/'):
        return 'audio'
    elif content_type == 'application/pdf':
        return 'document'
    else:
        return 'other'


# =========================================================
# 📦 MEDIA UPLOAD
# =========================================================

@router.post(
    "/upload",
    summary="Upload media file",
    description="Upload an image or video file to be attached to a post.",
    responses={
        200: {"description": "File uploaded successfully"},
        400: {"description": "Invalid file format or size"},
    },
)
async def upload_media(
    file: UploadFile = File(..., description="File to upload (image or video)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a media file and return its URL."""
    max_size_mb = 50 if file.content_type.startswith("video/") else 10
    validate_file(file, max_size_mb)
    
    # Generate unique filename
    unique_id = uuid.uuid4()
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
    filename = f"{unique_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Get file size
    file_size = os.path.getsize(file_path)
    
    # Determine media type
    media_type = determine_media_type(file.content_type)
    
    # Create media record
    media = MediaFile(
        owner_id=current_user.id,
        storage_provider="local",
        object_key=filename,
        original_name=file.filename,
        file_name=filename,
        file_extension=file_extension,
        mime_type=file.content_type,
        media_type=media_type,
        file_size_bytes=file_size,
        public_url=f"/uploads/{filename}",
        relative_path=f"/uploads/{filename}",
        visibility="public",
        is_active=True,
        is_deleted=False,
    )

    db.add(media)
    db.commit()
    db.refresh(media)

    return {
        "id": media.id,
        "url": media.public_url,
        "file_name": media.original_name,
        "mime_type": media.mime_type,
        "attachment_type": media.media_type,
    }


# =========================================================
# 📝 CREATE POST
# =========================================================

@router.post(
    "",
    response_model=PostResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new post",
    description="Create a post with optional attachments and class association.",
)
async def create_post_route(
    payload: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new post and broadcast to class members."""
    try:
        # Create the post
        post = create_post(db, current_user, payload)
        
        # Handle attachments if provided
        if payload.attachments:
            for att_data in payload.attachments:
                attachment = PostAttachment(
                    post_id=post.id,
                    media_file_id=att_data.get('media_file_id'),
                    attachment_type=att_data.get('attachment_type', 'file'),
                    file_url=att_data['file_url'],
                    file_name=att_data.get('file_name'),
                    mime_type=att_data.get('mime_type'),
                )
                db.add(attachment)
            db.commit()

        # Broadcast to class if applicable
        if post.class_id and post.status == "published":
            notify_class_post(db, post.id, current_user, post.class_id, post.title)
            
            asyncio.create_task(
                broadcast_to_class(
                    post.class_id,
                    {
                        "type": "new_post",
                        "post_id": post.id,
                        "author_id": current_user.id,
                        "author_name": current_user.full_name,
                        "author_avatar": current_user.profile.avatar_url if current_user.profile else None,
                        "class_id": post.class_id,
                        "content_preview": post.content[:100] if post.content else "",
                        "timestamp": post.created_at.isoformat()
                    }
                )
            )

        # Fetch complete post with relations
        post = post_query(db).filter(Post.id == post.id).first()
        return to_post_response(db, post, current_user)

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc)
        )


# =========================================================
# 📄 LIST POSTS WITH PAGINATION
# =========================================================

@router.get(
    "",
    response_model=PaginatedPostResponse,
    summary="List posts",
    description="Get a paginated list of posts with filtering.",
)
def list_posts(
    params: PostListParams = Depends(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get paginated list of posts with filters."""
    query = post_query(db).filter(Post.status == "published")
    
    # Apply filters
    if params.class_id:
        query = query.filter(Post.class_id == params.class_id)
    if params.subject_id:
        query = query.filter(Post.subject_id == params.subject_id)
    if params.author_id:
        query = query.filter(Post.author_id == params.author_id)
    if params.post_type:
        query = query.filter(Post.post_type == params.post_type)
    
    # Apply sorting
    sort_field = getattr(Post, params.sort_by, Post.created_at)
    if params.sort_order == "desc":
        query = query.order_by(desc(sort_field))
    else:
        query = query.order_by(sort_field)
    
    # Get total count before pagination
    total = query.count()
    
    # Apply pagination
    offset = (params.page - 1) * params.limit
    posts = query.offset(offset).limit(params.limit).all()
    
    # Filter by visibility
    visible_posts = [p for p in posts if can_view_post(db, p, current_user)]
    
    # Transform to response
    data = [to_post_response(db, p, current_user) for p in visible_posts]
    
    total_pages = (total + params.limit - 1) // params.limit
    
    return PaginatedPostResponse(
        data=data,
        total=total,
        page=params.page,
        limit=params.limit,
        total_pages=total_pages,
        has_next=params.page < total_pages,
        has_prev=params.page > 1,
    )


@router.get(
    "/feed",
    response_model=List[PostResponse],
    summary="Personalized feed",
    description="Get personalized feed based on user's classes and follows.",
)
def personalized_feed(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get personalized feed for the current user."""
    posts = post_query(db).filter(Post.status == "published").order_by(Post.created_at.desc()).all()
    visible = [p for p in posts if can_view_post(db, p, current_user)]
    return [to_post_response(db, p, current_user) for p in visible]


@router.get(
    "/mine",
    response_model=List[PostResponse],
    summary="My posts",
    description="Get all posts created by the current user.",
)
def my_posts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get posts created by the current user."""
    posts = post_query(db).filter(Post.author_id == current_user.id).order_by(Post.created_at.desc()).all()
    return [to_post_response(db, p, current_user) for p in posts]


# =========================================================
# 🔍 SINGLE POST
# =========================================================

@router.get(
    "/{post_id}",
    response_model=PostResponse,
    summary="Get post by ID",
    description="Retrieve a specific post by its ID.",
)
def get_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single post by ID."""
    post = post_query(db).filter(Post.id == post_id).first()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )

    if not can_view_post(db, post, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    return to_post_response(db, post, current_user)


# =========================================================
# ✏️ UPDATE POST
# =========================================================

@router.patch(
    "/{post_id}",
    response_model=PostResponse,
    summary="Update post",
    description="Update an existing post.",
)
def update_post_route(
    post_id: int,
    payload: PostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a post."""
    post = db.query(Post).filter(Post.id == post_id).first()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )

    if current_user.role != "admin" and post.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied"
        )

    updated = update_post(db, post, payload)
    updated = post_query(db).filter(Post.id == updated.id).first()

    return to_post_response(db, updated, current_user)


# =========================================================
# 🗑 DELETE POST
# =========================================================

@router.delete(
    "/{post_id}",
    response_model=PostActionResponse,
    summary="Delete post",
    description="Delete a post permanently.",
)
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a post."""
    post = db.query(Post).filter(Post.id == post_id).first()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )

    if current_user.role != "admin" and post.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied"
        )

    db.delete(post)
    db.commit()

    return PostActionResponse(message="Post deleted successfully")


# =========================================================
# 💬 COMMENTS
# =========================================================

@router.post(
    "/{post_id}/comments",
    response_model=PostCommentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add comment",
    description="Add a comment to a post.",
)
async def add_comment_route(
    post_id: int,
    payload: PostCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a comment and broadcast to class members."""
    post = post_query(db).filter(Post.id == post_id).first()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )

    if not can_view_post(db, post, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    comment = add_comment(db, post, current_user, payload)
    
    # Reload comment with author and profile
    comment = comment_query(db).filter(PostComment.id == comment.id).first()
    
    # Convert to response dictionary
    comment_response = to_comment_response(comment)
    
    # Broadcast comment via WebSocket
    if post.class_id:
        asyncio.create_task(
            broadcast_to_class(
                post.class_id,
                {
                    "type": "new_comment",
                    "comment_id": comment.id,
                    "post_id": post_id,
                    "author_id": current_user.id,
                    "author_name": current_user.full_name,
                    "author_avatar": current_user.profile.avatar_url if current_user.profile else None,
                    "content": payload.content,
                    "timestamp": comment.created_at.isoformat()
                }
            )
        )
    
    return comment_response


@router.get(
    "/{post_id}/comments",
    response_model=List[PostCommentResponse],
    summary="List comments",
    description="Get all comments for a post.",
)
def list_comments(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all comments for a post."""
    post = post_query(db).filter(Post.id == post_id).first()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )

    if not can_view_post(db, post, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    comments = comment_query(db).filter(
        PostComment.post_id == post_id
    ).order_by(PostComment.created_at.asc()).all()
    
    return [to_comment_response(comment) for comment in comments]


# =========================================================
# ❤️ REACTIONS
# =========================================================

@router.post(
    "/{post_id}/reactions",
    response_model=PostActionResponse,
    summary="React to post",
    description="Add or update a reaction to a post.",
)
async def react_to_post(
    post_id: int,
    payload: PostReactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a reaction and broadcast to class members."""
    post = post_query(db).filter(Post.id == post_id).first()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )

    if not can_view_post(db, post, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    add_or_update_reaction(db, post, current_user, payload)
    
    # Broadcast reaction update
    if post.class_id:
        asyncio.create_task(
            broadcast_to_class(
                post.class_id,
                {
                    "type": "reaction_update",
                    "post_id": post_id,
                    "user_id": current_user.id,
                    "user_name": current_user.full_name,
                    "reaction_type": payload.reaction_type,
                    "action": "added"
                }
            )
        )
    
    return PostActionResponse(message="Reaction saved")


@router.delete(
    "/{post_id}/reactions",
    response_model=PostActionResponse,
    summary="Remove reaction",
    description="Remove a reaction from a post.",
)
async def remove_post_reaction(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a reaction and broadcast to class members."""
    post = post_query(db).filter(Post.id == post_id).first()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )

    remove_reaction(db, post, current_user)
    
    # Broadcast reaction removal
    if post.class_id:
        asyncio.create_task(
            broadcast_to_class(
                post.class_id,
                {
                    "type": "reaction_update",
                    "post_id": post_id,
                    "user_id": current_user.id,
                    "user_name": current_user.full_name,
                    "action": "removed"
                }
            )
        )
    
    return PostActionResponse(message="Reaction removed")


# =========================================================
# 💾 SAVE / UNSAVE
# =========================================================

@router.post(
    "/{post_id}/save",
    response_model=PostActionResponse,
    summary="Save post",
    description="Save a post to bookmarks.",
)
def save_post_route(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save a post for later."""
    post = post_query(db).filter(Post.id == post_id).first()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )

    save_post(db, post, current_user)
    return PostActionResponse(message="Post saved")


@router.delete(
    "/{post_id}/save",
    response_model=PostActionResponse,
    summary="Unsave post",
    description="Remove a post from bookmarks.",
)
def unsave_post_route(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Unsave a post."""
    post = post_query(db).filter(Post.id == post_id).first()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )

    unsave_post(db, post, current_user)
    return PostActionResponse(message="Post unsaved")