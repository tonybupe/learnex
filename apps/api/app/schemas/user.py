from datetime import datetime
from typing import Optional, Dict, Any

from pydantic import BaseModel, EmailStr


# =========================================================
# 🔹 BASE CONFIG (SHARED)
# =========================================================

class ORMBase(BaseModel):
    model_config = {"from_attributes": True}


# =========================================================
# 🔹 USER PROFILE SCHEMAS
# =========================================================

class UserProfileBase(ORMBase):
    avatar_url: Optional[str] = None
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


# 👉 Used for PATCH /me/profile
class UpdateUserProfileRequest(BaseModel):
    avatar_url: Optional[str] = None
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


# =========================================================
# 🔹 USER SCHEMAS
# =========================================================

class UserBase(ORMBase):
    full_name: str
    email: EmailStr
    phone_number: Optional[str] = None
    sex: Optional[str] = None
    role: str
    is_active: bool
    is_verified: bool


# 🔹 FULL USER (FOR /me, DASHBOARD)
class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    profile: Optional[UserProfileResponse] = None

    followers_count: int = 0
    following_count: int = 0


# 🔹 PUBLIC USER (FOR SOCIAL)
class PublicUserResponse(UserBase):
    id: int

    followers_count: int = 0
    following_count: int = 0

    profile: Optional[UserProfileResponse] = None