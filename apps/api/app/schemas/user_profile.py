from pydantic import BaseModel
from typing import Optional, Dict


class UserProfileResponse(BaseModel):
    avatar_url: Optional[str]
    bio: Optional[str]

    date_of_birth: Optional[str]
    location: Optional[str]
    country: Optional[str]

    profession: Optional[str]
    organization: Optional[str]
    website: Optional[str]

    skills: Optional[Dict]
    interests: Optional[Dict]
    social_links: Optional[Dict]

    class Config:
        from_attributes = True


class UpdateUserProfileRequest(BaseModel):
    avatar_url: Optional[str] = None
    bio: Optional[str] = None

    date_of_birth: Optional[str] = None
    location: Optional[str] = None
    country: Optional[str] = None

    profession: Optional[str] = None
    organization: Optional[str] = None
    website: Optional[str] = None

    skills: Optional[Dict] = None
    interests: Optional[Dict] = None
    social_links: Optional[Dict] = None