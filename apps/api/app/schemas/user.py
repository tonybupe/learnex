from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, EmailStr


class ORMBase(BaseModel):
    model_config = {"from_attributes": True}


class UserProfileBase(ORMBase):
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


class UserProfileResponse(UserProfileBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime


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


class UserBase(ORMBase):
    full_name: str
    email: EmailStr
    phone_number: Optional[str] = None
    sex: Optional[str] = None
    role: str
    is_active: bool
    is_verified: bool


class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime
    profile: Optional[UserProfileResponse] = None
    followers_count: int = 0
    following_count: int = 0


class PublicUserResponse(UserBase):
    id: int
    followers_count: int = 0
    following_count: int = 0
    profile: Optional[UserProfileResponse] = None