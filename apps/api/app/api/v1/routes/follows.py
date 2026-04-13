from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.models.follow import Follow
from app.models.user import User
from app.schemas.follow import FollowActionResponse, FollowStatsResponse
from app.schemas.user import PublicUserResponse
from app.services.follow_service import follow_user, get_follow_stats, unfollow_user

router = APIRouter()


def build_public_user_response(db: Session, user: User) -> PublicUserResponse:
    followers_count = db.query(Follow).filter(Follow.following_id == user.id).count()
    following_count = db.query(Follow).filter(Follow.follower_id == user.id).count()

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
    )


@router.post("/{user_id}/follow", response_model=FollowActionResponse)
def follow_target_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        follow_user(db, current_user, user_id)
        return FollowActionResponse(message="User followed successfully")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/{user_id}/follow", response_model=FollowActionResponse)
def unfollow_target_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        unfollow_user(db, current_user, user_id)
        return FollowActionResponse(message="User unfollowed successfully")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/{user_id}/followers", response_model=List[PublicUserResponse])
def list_followers(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records = db.query(Follow).filter(Follow.following_id == user_id).all()
    users = [record.follower for record in records]
    return [build_public_user_response(db, user) for user in users]


@router.get("/{user_id}/following", response_model=List[PublicUserResponse])
def list_following(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records = db.query(Follow).filter(Follow.follower_id == user_id).all()
    users = [record.following for record in records]
    return [build_public_user_response(db, user) for user in users]


@router.get("/{user_id}/follow-stats")
def get_user_follow_stats(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    stats = get_follow_stats(db, user_id)
    is_following = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.following_id == user_id
    ).first() is not None
    return {
        "user_id": stats.user_id,
        "followers_count": stats.followers_count,
        "following_count": stats.following_count,
        "is_following": is_following,
    }