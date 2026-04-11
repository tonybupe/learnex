from sqlalchemy.orm import Session

from app.models.class_member import ClassMember
from app.models.class_room import ClassRoom
from app.models.follow import Follow
from app.models.post import Post
from app.models.media_file import MediaFile
from app.models.post_attachment import PostAttachment
from app.models.post_comment import PostComment
from app.models.post_reaction import PostReaction
from app.models.saved_post import SavedPost
from app.models.subject import Subject
from app.models.user import User
from app.schemas.posts import (
    PostAttachmentCreate,
    PostCommentCreate,
    PostCreate,
    PostReactionCreate,
    PostUpdate,
)


def create_post(db: Session, author: User, payload: PostCreate) -> Post:
    classroom = None
    if payload.class_id is not None:
        classroom = db.query(ClassRoom).filter(ClassRoom.id == payload.class_id).first()
        if not classroom:
            raise ValueError("Class not found")

        if payload.visibility == "class":
            if author.role == "teacher" and classroom.teacher_id != author.id:
                raise ValueError("Teachers can only post to their own classes")

            if author.role == "learner":
                membership = (
                    db.query(ClassMember)
                    .filter(
                        ClassMember.class_id == classroom.id,
                        ClassMember.learner_id == author.id,
                        ClassMember.status == "active",
                    )
                    .first()
                )
                if not membership:
                    raise ValueError("Learner must belong to the class to post to it")

    if payload.subject_id is not None:
        subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()
        if not subject:
            raise ValueError("Subject not found")

    post = Post(
        author_id=author.id,
        class_id=payload.class_id,
        subject_id=payload.subject_id,
        post_type=payload.post_type,
        visibility=payload.visibility,
        title=payload.title,
        content=payload.content,
        status=payload.status,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


def update_post(db: Session, post: Post, payload: PostUpdate) -> Post:
    if payload.class_id is not None:
        classroom = db.query(ClassRoom).filter(ClassRoom.id == payload.class_id).first()
        if not classroom:
            raise ValueError("Class not found")
        post.class_id = payload.class_id

    if payload.subject_id is not None:
        subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()
        if not subject:
            raise ValueError("Subject not found")
        post.subject_id = payload.subject_id

    if payload.post_type is not None:
        post.post_type = payload.post_type
    if payload.visibility is not None:
        post.visibility = payload.visibility
    if payload.title is not None:
        post.title = payload.title
    if payload.content is not None:
        post.content = payload.content
    if payload.status is not None:
        post.status = payload.status

    db.commit()
    db.refresh(post)
    return post


def add_attachment(db: Session, post: Post, payload: PostAttachmentCreate) -> PostAttachment:
    if payload.media_file_id is not None:
        media = db.query(MediaFile).filter(MediaFile.id == payload.media_file_id, MediaFile.is_deleted.is_(False)).first()
        if not media:
            raise ValueError("Media file not found")

    attachment = PostAttachment(
        post_id=post.id,
        media_file_id=payload.media_file_id,
        attachment_type=payload.attachment_type,
        file_url=payload.file_url,
        file_name=payload.file_name,
        mime_type=payload.mime_type,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


def add_comment(db: Session, post: Post, author: User, payload: PostCommentCreate) -> PostComment:
    comment = PostComment(
        post_id=post.id,
        author_id=author.id,
        content=payload.content,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


def add_or_update_reaction(db: Session, post: Post, user: User, payload: PostReactionCreate) -> PostReaction:
    reaction = (
        db.query(PostReaction)
        .filter(PostReaction.post_id == post.id, PostReaction.user_id == user.id)
        .first()
    )

    if reaction:
        reaction.reaction_type = payload.reaction_type
        db.commit()
        db.refresh(reaction)
        return reaction

    reaction = PostReaction(
        post_id=post.id,
        user_id=user.id,
        reaction_type=payload.reaction_type,
    )
    db.add(reaction)
    db.commit()
    db.refresh(reaction)
    return reaction


def remove_reaction(db: Session, post: Post, user: User) -> None:
    reaction = (
        db.query(PostReaction)
        .filter(PostReaction.post_id == post.id, PostReaction.user_id == user.id)
        .first()
    )
    if not reaction:
        raise ValueError("Reaction not found")

    db.delete(reaction)
    db.commit()


def save_post(db: Session, post: Post, user: User) -> None:
    existing = (
        db.query(SavedPost)
        .filter(SavedPost.post_id == post.id, SavedPost.user_id == user.id)
        .first()
    )
    if existing:
        raise ValueError("Post already saved")

    record = SavedPost(post_id=post.id, user_id=user.id)
    db.add(record)
    db.commit()


def unsave_post(db: Session, post: Post, user: User) -> None:
    existing = (
        db.query(SavedPost)
        .filter(SavedPost.post_id == post.id, SavedPost.user_id == user.id)
        .first()
    )
    if not existing:
        raise ValueError("Saved post not found")

    db.delete(existing)
    db.commit()


def can_view_post(db: Session, post: Post, user: User) -> bool:
    if post.visibility == "public":
        return True

    if post.visibility == "followers":
        if post.author_id == user.id:
            return True
        follow = (
            db.query(Follow)
            .filter(Follow.follower_id == user.id, Follow.following_id == post.author_id)
            .first()
        )
        return follow is not None

    if post.visibility == "class":
        if post.class_id is None:
            return False
        if user.role == "admin":
            return True
        if user.role == "teacher" and post.classroom and post.classroom.teacher_id == user.id:
            return True
        membership = (
            db.query(ClassMember)
            .filter(
                ClassMember.class_id == post.class_id,
                ClassMember.learner_id == user.id,
                ClassMember.status == "active",
            )
            .first()
        )
        return membership is not None

    return False