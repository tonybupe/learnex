from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
import uuid, os
from app.core.config import settings
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user, require_roles
from app.models.follow import Follow
from app.models.user import User
from app.models.user_profile import UserProfile
from app.schemas.user import PublicUserResponse, UserResponse
from app.schemas.user_profile import (
    UserProfileResponse,
    UpdateUserProfileRequest,
)

router = APIRouter()


# =========================================================
# 🔧 HELPERS
# =========================================================

def ensure_profile(db: Session, user_id: int) -> UserProfile:
    profile = db.query(UserProfile).filter(
        UserProfile.user_id == user_id
    ).first()

    if not profile:
        profile = UserProfile(user_id=user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return profile


def serialize_profile(profile: UserProfile) -> dict:
    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "avatar_url": profile.avatar_url,
        "bio": profile.bio,
        "date_of_birth": profile.date_of_birth,
        "location": profile.location,
        "country": profile.country,
        "profession": profile.profession,
        "organization": profile.organization,
        "website": profile.website,
        "skills": profile.skills or {},
        "interests": profile.interests or {},
        "social_links": profile.social_links or {},
        "created_at": profile.created_at,
        "updated_at": profile.updated_at,
    }


def get_follow_stats(db: Session, user_id: int):
    followers_count = db.query(Follow).filter(
        Follow.following_id == user_id
    ).count()

    following_count = db.query(Follow).filter(
        Follow.follower_id == user_id
    ).count()

    return followers_count, following_count


def build_user_response(db: Session, user: User) -> UserResponse:
    profile = ensure_profile(db, user.id)
    followers_count, following_count = get_follow_stats(db, user.id)

    return UserResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone_number=user.phone_number,
        sex=user.sex,
        role=user.role,
        is_active=user.is_active,
        is_verified=user.is_verified,
        created_at=user.created_at,
        updated_at=user.updated_at,
        profile=serialize_profile(profile),  
        followers_count=followers_count,
        following_count=following_count,
    )


def build_public_user_response(db: Session, user: User) -> PublicUserResponse:
    profile = ensure_profile(db, user.id)
    followers_count, following_count = get_follow_stats(db, user.id)

    return PublicUserResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone_number=user.phone_number,
        sex=user.sex,
        role=user.role,
        is_active=user.is_active,
        is_verified=user.is_verified,
        followers_count=followers_count,
        following_count=following_count,
        profile=serialize_profile(profile), 
    )


# =========================================================
# 👤 CURRENT USER
# =========================================================

@router.get("/me", response_model=UserResponse)
def get_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return build_user_response(db, current_user)


# =========================================================
# 📄 MY PROFILE
# =========================================================

@router.get("/me/profile", response_model=UserProfileResponse)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = ensure_profile(db, current_user.id)
    return profile


# =========================================================
# ✏️ UPDATE MY PROFILE
# =========================================================

@router.patch("/me/profile", response_model=UserProfileResponse)
def update_my_profile(
    payload: UpdateUserProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = ensure_profile(db, current_user.id)

    update_data = payload.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)

    return profile


# =========================================================
# 👥 LIST USERS (ADMIN ONLY)
# =========================================================

@router.get("", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    users = db.query(User).all()
    return [build_user_response(db, user) for user in users]


# =========================================================
# 👤 PUBLIC USER PROFILE
# =========================================================

@router.get("/{user_id}", response_model=PublicUserResponse)
def get_user_profile(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return build_public_user_response(db, user)