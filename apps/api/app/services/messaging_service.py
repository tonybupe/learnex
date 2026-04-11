from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from app.models.class_member import ClassMember
from app.models.class_room import ClassRoom
from app.models.conversation import Conversation
from app.models.conversation_participant import ConversationParticipant
from app.models.lesson import Lesson
from app.models.media_file import MediaFile
from app.models.message import Message
from app.models.user import User
from app.services.notification_service import create_notification


def get_participant(db: Session, conversation_id: int, user_id: int) -> ConversationParticipant | None:
    return (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
        )
        .first()
    )


def ensure_direct_conversation_access(current_user: User, target_user: User) -> None:
    if current_user.id == target_user.id:
        raise ValueError("You cannot create a direct conversation with yourself")


def get_or_create_direct_conversation(db: Session, current_user: User, target_user: User) -> Conversation:
    ensure_direct_conversation_access(current_user, target_user)

    current_conv_ids = (
        db.query(ConversationParticipant.conversation_id)
        .filter(ConversationParticipant.user_id == current_user.id)
        .subquery()
    )

    existing = (
        db.query(Conversation)
        .join(
            ConversationParticipant,
            ConversationParticipant.conversation_id == Conversation.id,
        )
        .filter(
            Conversation.id.in_(current_conv_ids),
            Conversation.conversation_type == "direct",
            ConversationParticipant.user_id == target_user.id,
        )
        .first()
    )

    if existing:
        participant_count = (
            db.query(ConversationParticipant)
            .filter(ConversationParticipant.conversation_id == existing.id)
            .count()
        )
        if participant_count == 2:
            return existing

    conversation = Conversation(
        conversation_type="direct",
        title=None,
        class_id=None,
        lesson_id=None,
        created_by_id=current_user.id,
        is_active=True,
    )
    db.add(conversation)
    db.flush()

    db.add(
        ConversationParticipant(
            conversation_id=conversation.id,
            user_id=current_user.id,
            role="owner",
            is_muted=False,
            last_read_message_id=None,
        )
    )
    db.add(
        ConversationParticipant(
            conversation_id=conversation.id,
            user_id=target_user.id,
            role="member",
            is_muted=False,
            last_read_message_id=None,
        )
    )

    db.commit()
    db.refresh(conversation)
    return conversation


def get_or_create_class_discussion(db: Session, current_user: User, class_id: int) -> Conversation:
    classroom = db.query(ClassRoom).filter(ClassRoom.id == class_id).first()
    if not classroom:
        raise ValueError("Class not found")

    if current_user.role == "teacher" and classroom.teacher_id != current_user.id:
        raise ValueError("You can only access discussion for your own class")
    elif current_user.role == "learner":
        membership = (
            db.query(ClassMember)
            .filter(
                ClassMember.class_id == class_id,
                ClassMember.learner_id == current_user.id,
                ClassMember.status == "active",
            )
            .first()
        )
        if not membership:
            raise ValueError("You are not a member of this class")

    existing = (
        db.query(Conversation)
        .filter(
            Conversation.conversation_type == "class_thread",
            Conversation.class_id == class_id,
        )
        .first()
    )
    if existing:
        return existing

    conversation = Conversation(
        conversation_type="class_thread",
        title=f"{classroom.title} Discussion",
        class_id=class_id,
        lesson_id=None,
        created_by_id=current_user.id,
        is_active=True,
    )
    db.add(conversation)
    db.flush()

    db.add(
        ConversationParticipant(
            conversation_id=conversation.id,
            user_id=classroom.teacher_id,
            role="owner",
            is_muted=False,
            last_read_message_id=None,
        )
    )

    learners = (
        db.query(ClassMember)
        .filter(ClassMember.class_id == class_id, ClassMember.status == "active")
        .all()
    )
    for learner in learners:
        if learner.learner_id != classroom.teacher_id:
            db.add(
                ConversationParticipant(
                    conversation_id=conversation.id,
                    user_id=learner.learner_id,
                    role="member",
                    is_muted=False,
                    last_read_message_id=None,
                )
            )

    db.commit()
    db.refresh(conversation)
    return conversation


def get_or_create_lesson_discussion(db: Session, current_user: User, lesson_id: int) -> Conversation:
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise ValueError("Lesson not found")

    existing = (
        db.query(Conversation)
        .filter(
            Conversation.conversation_type == "lesson_thread",
            Conversation.lesson_id == lesson_id,
        )
        .first()
    )
    if existing:
        return existing

    classroom = db.query(ClassRoom).filter(ClassRoom.id == lesson.class_id).first()
    if not classroom:
        raise ValueError("Class not found for lesson")

    conversation = Conversation(
        conversation_type="lesson_thread",
        title=f"{lesson.title} Discussion",
        class_id=lesson.class_id,
        lesson_id=lesson.id,
        created_by_id=current_user.id,
        is_active=True,
    )
    db.add(conversation)
    db.flush()

    db.add(
        ConversationParticipant(
            conversation_id=conversation.id,
            user_id=lesson.teacher_id,
            role="owner",
            is_muted=False,
            last_read_message_id=None,
        )
    )

    learners = (
        db.query(ClassMember)
        .filter(ClassMember.class_id == lesson.class_id, ClassMember.status == "active")
        .all()
    )
    for learner in learners:
        if learner.learner_id != lesson.teacher_id:
            db.add(
                ConversationParticipant(
                    conversation_id=conversation.id,
                    user_id=learner.learner_id,
                    role="member",
                    is_muted=False,
                    last_read_message_id=None,
                )
            )

    db.commit()
    db.refresh(conversation)
    return conversation


def ensure_conversation_access(db: Session, conversation_id: int, user_id: int) -> None:
    participant = get_participant(db, conversation_id, user_id)
    if not participant:
        raise ValueError("You do not have access to this conversation")


def send_message(db: Session, conversation: Conversation, sender: User, content: str, message_type: str = "text", media_file_id: int | None = None) -> Message:
    ensure_conversation_access(db, conversation.id, sender.id)

    if media_file_id is not None:
        media = db.query(MediaFile).filter(MediaFile.id == media_file_id, MediaFile.is_deleted.is_(False)).first()
        if not media:
            raise ValueError("Media file not found")

    message = Message(
        conversation_id=conversation.id,
        sender_id=sender.id,
        content=content,
        message_type=message_type,
        media_file_id=media_file_id,
        is_edited=False,
        is_deleted=False,
    )
    db.add(message)
    db.flush()

    sender_participant = get_participant(db, conversation.id, sender.id)
    if sender_participant:
        sender_participant.last_read_message_id = message.id

    other_participants = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == conversation.id,
            ConversationParticipant.user_id != sender.id,
        )
        .all()
    )

    for participant in other_participants:
        create_notification(
            db,
            user_id=participant.user_id,
            actor_id=sender.id,
            notification_type="new_message",
            title="New message",
            message=f"{sender.full_name} sent a message",
            entity_type="conversation",
            entity_id=conversation.id,
            action_url=f"/conversations/{conversation.id}",
        )

    db.commit()
    db.refresh(message)
    return message


def update_message(db: Session, message: Message, current_user: User, content: str) -> Message:
    if message.sender_id != current_user.id:
        raise ValueError("You can only edit your own messages")
    if message.is_deleted:
        raise ValueError("Deleted message cannot be edited")

    message.content = content
    message.is_edited = True
    db.commit()
    db.refresh(message)
    return message


def delete_message(db: Session, message: Message, current_user: User) -> Message:
    if message.sender_id != current_user.id and current_user.role != "admin":
        raise ValueError("You can only delete your own messages")

    message.is_deleted = True
    message.content = "[deleted]"
    db.commit()
    db.refresh(message)
    return message


def mark_conversation_read(db: Session, conversation_id: int, user_id: int) -> ConversationParticipant:
    participant = get_participant(db, conversation_id, user_id)
    if not participant:
        raise ValueError("Conversation participant not found")

    latest_message = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id, Message.is_deleted.is_(False))
        .order_by(Message.id.desc())
        .first()
    )
    if latest_message:
        participant.last_read_message_id = latest_message.id

    db.commit()
    db.refresh(participant)
    return participant


def unread_count_for_conversation(db: Session, conversation_id: int, user_id: int) -> int:
    participant = get_participant(db, conversation_id, user_id)
    if not participant:
        raise ValueError("Conversation participant not found")

    if participant.last_read_message_id is None:
        return (
            db.query(Message)
            .filter(
                Message.conversation_id == conversation_id,
                Message.sender_id != user_id,
                Message.is_deleted.is_(False),
            )
            .count()
        )

    return (
        db.query(Message)
        .filter(
            Message.conversation_id == conversation_id,
            Message.sender_id != user_id,
            Message.is_deleted.is_(False),
            Message.id > participant.last_read_message_id,
        )
        .count()
    )


def total_unread_count(db: Session, user_id: int) -> int:
    participants = (
        db.query(ConversationParticipant)
        .filter(ConversationParticipant.user_id == user_id)
        .all()
    )

    total = 0
    for participant in participants:
        if participant.last_read_message_id is None:
            total += (
                db.query(Message)
                .filter(
                    Message.conversation_id == participant.conversation_id,
                    Message.sender_id != user_id,
                    Message.is_deleted.is_(False),
                )
                .count()
            )
        else:
            total += (
                db.query(Message)
                .filter(
                    Message.conversation_id == participant.conversation_id,
                    Message.sender_id != user_id,
                    Message.is_deleted.is_(False),
                    Message.id > participant.last_read_message_id,
                )
                .count()
            )
    return total