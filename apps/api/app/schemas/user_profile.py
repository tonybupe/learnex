from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel


class UserProfileResponse(BaseModel):
    id: int
    user_id: int
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    bio: Optional[str] = None
    date_of_birth: Optional[str] = None
    location: Optional[str] = None
    country: Optional[str] = None
    profession: Optional[str] = None
    organization: Optional[str] = None
    website: Optional[str] = None
    skills: Optional[Dict[str, Any]] = None
    interests: Optional[Dict[str, Any]] = None
    social_links: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UpdateUserProfileRequest(BaseModel):
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    bio: Optional[str] = None
    date_of_birth: Optional[str] = None
    location: Optional[str] = None
    country: Optional[str] = None
    profession: Optional[str] = None
    organization: Optional[str] = None
    website: Optional[str] = None
    skills: Optional[Dict[str, Any]] = None
    interests: Optional[Dict[str, Any]] = None
    social_links: Optional[Dict[str, Any]] = None