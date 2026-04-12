# app/schemas/posts.py
"""
Post schemas for request/response validation and serialization.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict, field_validator


# =========================================================
# AUTHOR SCHEMAS
# =========================================================

class PostAuthorMiniResponse(BaseModel):
    """Minimal author information for posts and comments."""
    id: int = Field(..., description="User ID")
    full_name: str = Field(..., description="User's full name")
    email: str = Field(..., description="User's email address")
    role: str = Field(..., description="User role (admin, teacher, learner)")
    profile: Optional[Dict[str, Any]] = Field(
        default=None,
        description="User profile with avatar, bio, location, etc."
    )
    
    @field_validator('profile', mode='before')
    @classmethod
    def convert_profile_to_dict(cls, v):
        """Convert SQLAlchemy profile model to dict if needed."""
        if v is None:
            return None
        if hasattr(v, '__dict__'):
            return {
                'avatar_url': getattr(v, 'avatar_url', None),
                'bio': getattr(v, 'bio', None),
                'location': getattr(v, 'location', None),
                'website': getattr(v, 'website', None),
            }
        return v
    
    attachments: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="List of attachment data dicts"
    )

    model_config = ConfigDict(from_attributes=True)


# =========================================================
# POST SCHEMAS
# =========================================================

class PostCreate(BaseModel):
    """Schema for creating a new post."""
    class_id: Optional[int] = Field(
        default=None,
        description="Class ID if post is in a class"
    )
    subject_id: Optional[int] = Field(
        default=None,
        description="Subject ID if post is for a subject"
    )
    post_type: str = Field(
        default="text",
        pattern="^(text|note|lesson|image|video|link|announcement)$",
        description="Type of post (text, note, lesson, image, video, link, announcement)"
    )
    visibility: str = Field(
        default="public",
        pattern="^(public|followers|class)$",
        description="Who can see this post (public, followers, class)"
    )
    title: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Post title (optional)"
    )
    content: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="Post content"
    )
    status: str = Field(
        default="published",
        pattern="^(draft|published|archived)$",
        description="Post status (draft, published, archived)"
    )
    
    attachments: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="List of attachment data dicts"
    )

    model_config = ConfigDict(from_attributes=True)


class PostUpdate(BaseModel):
    """Schema for updating an existing post."""
    class_id: Optional[int] = Field(
        default=None,
        description="Class ID if post is in a class"
    )
    subject_id: Optional[int] = Field(
        default=None,
        description="Subject ID if post is for a subject"
    )
    post_type: Optional[str] = Field(
        default=None,
        pattern="^(text|note|lesson|image|video|link|announcement)$",
        description="Type of post"
    )
    visibility: Optional[str] = Field(
        default=None,
        pattern="^(public|followers|class)$",
        description="Who can see this post"
    )
    title: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Post title"
    )
    content: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=5000,
        description="Post content"
    )
    status: Optional[str] = Field(
        default=None,
        pattern="^(draft|published|archived)$",
        description="Post status"
    )
    
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# ATTACHMENT SCHEMAS
# =========================================================

class PostAttachmentCreate(BaseModel):
    """Schema for creating a post attachment."""
    media_file_id: Optional[int] = Field(
        default=None,
        description="ID of media file from media table"
    )
    attachment_type: str = Field(
        ...,
        pattern="^(image|video|file|link)$",
        description="Type of attachment (image, video, file, link)"
    )
    file_url: str = Field(
        ...,
        description="URL to the file or resource"
    )
    file_name: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Original file name"
    )
    mime_type: Optional[str] = Field(
        default=None,
        description="MIME type of the file (e.g., image/jpeg, video/mp4)"
    )
    
    model_config = ConfigDict(from_attributes=True)


class PostAttachmentResponse(BaseModel):
    """Schema for post attachment response."""
    id: int = Field(..., description="Attachment ID")
    media_file_id: Optional[int] = Field(default=None, description="ID of associated media file")
    attachment_type: str = Field(..., description="Type of attachment")
    file_url: str = Field(..., description="URL to the file")
    file_name: Optional[str] = Field(default=None, description="Original file name")
    mime_type: Optional[str] = Field(default=None, description="MIME type of the file")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# COMMENT SCHEMAS
# =========================================================

class PostCommentCreate(BaseModel):
    """Schema for creating a comment."""
    content: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="Comment content"
    )
    
    model_config = ConfigDict(from_attributes=True)


class PostCommentResponse(BaseModel):
    """Schema for comment response with nested author."""
    id: int = Field(..., description="Comment ID")
    post_id: int = Field(..., description="ID of the parent post")
    author: PostAuthorMiniResponse = Field(..., description="Comment author information")
    content: str = Field(..., description="Comment content")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# REACTION SCHEMAS
# =========================================================

class PostReactionCreate(BaseModel):
    """Schema for creating a post reaction."""
    reaction_type: str = Field(
        default="like",
        pattern="^(like|love|insightful|celebrate)$",
        description="Type of reaction (like, love, insightful, celebrate)"
    )
    
    model_config = ConfigDict(from_attributes=True)


class PostActionResponse(BaseModel):
    """Generic response for post actions."""
    message: str = Field(..., description="Success or error message")
    data: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional response data"
    )
    
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# SUBJECT & CLASS MINI SCHEMAS
# =========================================================

class PostSubjectMiniResponse(BaseModel):
    """Minimal subject information."""
    id: int = Field(..., description="Subject ID")
    name: str = Field(..., description="Subject name")
    code: str = Field(..., description="Subject code (e.g., MATH101)")
    
    model_config = ConfigDict(from_attributes=True)


class PostClassMiniResponse(BaseModel):
    """Minimal class information."""
    id: int = Field(..., description="Class ID")
    title: str = Field(..., description="Class title")
    class_code: str = Field(..., description="Unique class code for joining")
    grade_level: Optional[str] = Field(
        default=None,
        description="Grade level (e.g., 10th Grade, Senior)"
    )
    
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# FULL POST RESPONSE
# =========================================================

class PostResponse(BaseModel):
    """Complete post response with all relations."""
    id: int = Field(..., description="Post ID")
    post_type: str = Field(..., description="Type of post")
    visibility: str = Field(..., description="Post visibility")
    title: Optional[str] = Field(default=None, description="Post title")
    content: str = Field(..., description="Post content")
    status: str = Field(..., description="Post status")
    author: PostAuthorMiniResponse = Field(..., description="Post author information")
    classroom: Optional[PostClassMiniResponse] = Field(
        default=None,
        description="Associated class (if any)"
    )
    subject: Optional[PostSubjectMiniResponse] = Field(
        default=None,
        description="Associated subject (if any)"
    )
    attachments: List[PostAttachmentResponse] = Field(
        default_factory=list,
        description="List of attachments"
    )
    reactions_count: int = Field(default=0, description="Total number of reactions")
    comments_count: int = Field(default=0, description="Total number of comments")
    saves_count: int = Field(default=0, description="Total number of saves")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# PAGINATION SCHEMAS
# =========================================================

class PostListParams(BaseModel):
    """Query parameters for listing posts."""
    page: int = Field(
        default=1,
        ge=1,
        description="Page number"
    )
    limit: int = Field(
        default=20,
        ge=1,
        le=100,
        description="Items per page"
    )
    sort_by: str = Field(
        default="created_at",
        pattern="^(created_at|updated_at|reactions_count|comments_count)$",
        description="Sort field"
    )
    sort_order: str = Field(
        default="desc",
        pattern="^(asc|desc)$",
        description="Sort order (asc or desc)"
    )
    class_id: Optional[int] = Field(
        default=None,
        description="Filter by class ID"
    )
    subject_id: Optional[int] = Field(
        default=None,
        description="Filter by subject ID"
    )
    author_id: Optional[int] = Field(
        default=None,
        description="Filter by author ID"
    )
    post_type: Optional[str] = Field(
        default=None,
        pattern="^(text|note|lesson|image|video|link|announcement)$",
        description="Filter by post type"
    )
    
    model_config = ConfigDict(from_attributes=True)


class PaginatedPostResponse(BaseModel):
    """Paginated response for posts list."""
    data: List[PostResponse] = Field(..., description="List of posts")
    total: int = Field(..., description="Total number of posts")
    page: int = Field(..., description="Current page number")
    limit: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Whether there is a next page")
    has_prev: bool = Field(..., description="Whether there is a previous page")
    
    model_config = ConfigDict(from_attributes=True)
