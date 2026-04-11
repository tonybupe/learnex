from sqlalchemy.orm import Session

from app.models.follow import Follow
from app.models.user import User
from app.schemas.follow import FollowStatsResponse
from app.services.notification_service import notify_new_follower


def follow_user(db: Session, current_user: User, target_user_id: int) -> Follow:
    if current_user.id == target_user_id:
        raise ValueError("You cannot follow yourself")

    target_user = db.query(User).filter(User.id == target_user_id).first()
    if not target_user:
        raise ValueError("Target user not found")

    existing = (
        db.query(Follow)
        .filter(Follow.follower_id == current_user.id, Follow.following_id == target_user_id)
        .first()
    )
    if existing:
        raise ValueError("You are already following this user")

    follow = Follow(
        follower_id=current_user.id,
        following_id=target_user_id,
    )
    db.add(follow)
    db.commit()
    db.refresh(follow)

    notify_new_follower(db, current_user, target_user)
    return follow


def unfollow_user(db: Session, current_user: User, target_user_id: int) -> None:
    follow = (
        db.query(Follow)
        .filter(Follow.follower_id == current_user.id, Follow.following_id == target_user_id)
        .first()
    )
    if not follow:
        raise ValueError("You are not following this user")

    db.delete(follow)
    db.commit()


def get_follow_stats(db: Session, user_id: int) -> FollowStatsResponse:
    followers_count = db.query(Follow).filter(Follow.following_id == user_id).count()
    following_count = db.query(Follow).filter(Follow.follower_id == user_id).count()
    return FollowStatsResponse(
        user_id=user_id,
        followers_count=followers_count,
        following_count=following_count,
    )