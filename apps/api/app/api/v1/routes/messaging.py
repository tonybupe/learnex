from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session, joinedload
from typing import Dict, List

router = APIRouter()

from app.core.database import get_db
from app.deps import get_current_user
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.user import User
from app.schemas.messaging import (
    ConversationCreate,
    ConversationParticipantResponse,
    ConversationResponse,
    MessageActionResponse,
    MessageCreate,
    MessageResponse,
    MessageUpdate,
    TotalUnreadResponse,
    UnreadCounterResponse,
)
from app.services.messaging_service import (
    delete_message,
    get_or_create_class_discussion,
    get_or_create_direct_conversation,
    get_or_create_lesson_discussion,
    mark_conversation_read,
    send_message,
    total_unread_count,
    unread_count_for_conversation,
    update_message,
)

router = APIRouter()


@router.post("/direct", response_model=ConversationResponse)
def start_direct_conversation(
    payload: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.recipient_user_id is None:
        raise HTTPException(status_code=400, detail="recipient_user_id is required")

    target_user = db.query(User).filter(User.id == payload.recipient_user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")

    try:
        return get_or_create_direct_conversation(db, current_user, target_user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/class/{class_id}", response_model=ConversationResponse)
def start_class_discussion(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return get_or_create_class_discussion(db, current_user, class_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/lesson/{lesson_id}", response_model=ConversationResponse)
def start_lesson_discussion(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return get_or_create_lesson_discussion(db, current_user, lesson_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("", response_model=list[ConversationResponse])
def list_my_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversations = (
        db.query(Conversation)
        .join(Conversation.participants)
        .filter_by(user_id=current_user.id)
        .order_by(Conversation.updated_at.desc())
        .all()
    )
    return conversations


@router.get("/{conversation_id}", response_model=ConversationResponse)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = db.query(Conversation).options(joinedload(Conversation.participants).joinedload('user').joinedload('profile')).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    participant = next((p for p in conversation.participants if p.user_id == current_user.id), None)
    if not participant:
        raise HTTPException(status_code=403, detail="You do not have access to this conversation")

    return conversation


@router.get("/{conversation_id}/participants", response_model=list[ConversationParticipantResponse])
def list_participants(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    participant = next((p for p in conversation.participants if p.user_id == current_user.id), None)
    if not participant:
        raise HTTPException(status_code=403, detail="You do not have access to this conversation")

    return conversation.participants


@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
def list_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    participant = next((p for p in conversation.participants if p.user_id == current_user.id), None)
    if not participant:
        raise HTTPException(status_code=403, detail="You do not have access to this conversation")

    msgs = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )
    # Manually attach sender info
    from app.models.user import User as UserModel
    from app.models.profile import UserProfile
    result = []
    for msg in msgs:
        sender = db.query(UserModel).filter(UserModel.id == msg.sender_id).first()
        msg_dict = {
            "id": msg.id,
            "conversation_id": msg.conversation_id,
            "sender_id": msg.sender_id,
            "content": msg.content,
            "message_type": msg.message_type,
            "media_file_id": msg.media_file_id,
            "is_edited": msg.is_edited,
            "is_deleted": msg.is_deleted,
            "created_at": msg.created_at,
            "updated_at": msg.updated_at,
            "sender": {
                "id": sender.id,
                "full_name": sender.full_name,
                "email": sender.email,
                "role": sender.role,
                "profile": {
                    "avatar_url": sender.profile.avatar_url if sender.profile else None,
                    "bio": sender.profile.bio if sender.profile else None,
                } if sender and sender.profile else None
            } if sender else None
        }
        result.append(msg_dict)
    return result


@router.post("/{conversation_id}/messages", response_model=MessageResponse)
def create_message(
    conversation_id: int,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    try:
        return send_message(
            db,
            conversation,
            current_user,
            payload.content,
            payload.message_type,
            payload.media_file_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.patch("/messages/{message_id}", response_model=MessageResponse)
def edit_message(
    message_id: int,
    payload: MessageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    try:
        return update_message(db, message, current_user, payload.content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/messages/{message_id}", response_model=MessageActionResponse)
def remove_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    try:
        delete_message(db, message, current_user)
        return MessageActionResponse(message="Message deleted successfully")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/{conversation_id}/read", response_model=MessageActionResponse)
def mark_read(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        mark_conversation_read(db, conversation_id, current_user.id)
        return MessageActionResponse(message="Conversation marked as read")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/{conversation_id}/unread-count", response_model=UnreadCounterResponse)
def get_unread_count(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        count = unread_count_for_conversation(db, conversation_id, current_user.id)
        return UnreadCounterResponse(conversation_id=conversation_id, unread_count=count)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/unread/total", response_model=TotalUnreadResponse)
def get_total_unread(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = total_unread_count(db, current_user.id)
    return TotalUnreadResponse(total_unread_count=count)



class ConnectionManager:

    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, conversation_id: int, websocket: WebSocket):
        await websocket.accept()

        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = []

        self.active_connections[conversation_id].append(websocket)

    def disconnect(self, conversation_id: int, websocket: WebSocket):

        self.active_connections[conversation_id].remove(websocket)

    async def broadcast(self, conversation_id: int, message: dict):

        if conversation_id not in self.active_connections:
            return

        for connection in self.active_connections[conversation_id]:
            await connection.send_json(message)


manager = ConnectionManager()


@router.websocket("/ws/{conversation_id}")
async def websocket_endpoint(websocket: WebSocket, conversation_id: int):

    await manager.connect(conversation_id, websocket)

    try:

        while True:

            data = await websocket.receive_json()

            await manager.broadcast(conversation_id, data)

    except WebSocketDisconnect:

        manager.disconnect(conversation_id, websocket)