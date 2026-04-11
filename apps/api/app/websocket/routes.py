# backend/websocket/routes.py
import json
import uuid
import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user_websocket
from app.models.user import User
from .manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT access token for authentication"),
    db: Session = Depends(get_db),
):
    """
    WebSocket endpoint for real-time updates.
    """
    connection_id = str(uuid.uuid4())
    user: Optional[User] = None
    
    # ACCEPT FIRST
    await websocket.accept()
    logger.info(f"WebSocket connection accepted: {connection_id}")
    
    try:
        # AUTHENTICATE
        user = await get_current_user_websocket(token, db)
        if not user:
            logger.warning(f"WebSocket auth failed: invalid token for connection {connection_id}")
            await websocket.send_json({
                "type": "error",
                "code": "AUTH_FAILED",
                "message": "Invalid or expired token. Please reconnect."
            })
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        # REGISTER CONNECTION
        manager.active_connections[connection_id] = websocket
        manager.user_connections[user.id] = connection_id
        
        logger.info(f"WebSocket registered: user_id={user.id}, name={user.full_name}, connection={connection_id}")
        
        # SEND WELCOME
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "user_id": user.id,
            "message": "Connected to Learnex WebSocket",
            "timestamp": datetime.now().isoformat()
        })
        
        # SEND INIT DATA
        subscribed_classes = list(manager.user_classes.get(user.id, []))
        await websocket.send_json({
            "type": "init",
            "user_id": user.id,
            "user_name": user.full_name,
            "user_role": user.role,
            "subscribed_classes": subscribed_classes,
            "server_time": datetime.now().isoformat()
        })
        
        logger.info(f"WebSocket ready for user {user.id}: connection={connection_id}")
        
        # MESSAGE LOOP
        while True:
            try:
                raw_message = await websocket.receive_text()
                data = json.loads(raw_message)
                
                message_type = data.get("type")
                
                if message_type == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": data.get("timestamp", datetime.now().isoformat())
                    })
                elif message_type == "join_class":
                    class_id = data.get("class_id")
                    user_id = data.get("user_id")
                    if class_id and user_id:
                        if class_id not in manager.class_rooms:
                            manager.class_rooms[class_id] = set()
                        manager.class_rooms[class_id].add(connection_id)
                        
                        if user_id not in manager.user_classes:
                            manager.user_classes[user_id] = set()
                        manager.user_classes[user_id].add(class_id)
                        
                        await websocket.send_json({
                            "type": "class_joined",
                            "class_id": class_id,
                            "message": f"Joined class {class_id}"
                        })
                elif message_type == "leave_class":
                    class_id = data.get("class_id")
                    user_id = data.get("user_id")
                    if class_id and user_id:
                        if class_id in manager.class_rooms:
                            manager.class_rooms[class_id].discard(connection_id)
                        if user_id in manager.user_classes:
                            manager.user_classes[user_id].discard(class_id)
                        
                        await websocket.send_json({
                            "type": "class_left",
                            "class_id": class_id,
                            "message": f"Left class {class_id}"
                        })
                        
            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected: user={user.id}, connection={connection_id}")
                break
            except Exception as e:
                logger.error(f"Error in message loop for user {user.id}: {e}")
                continue
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected during auth: connection={connection_id}")
    except Exception as e:
        logger.error(f"Unexpected error for connection {connection_id}: {e}")
    finally:
        # CLEANUP
        if connection_id in manager.active_connections:
            del manager.active_connections[connection_id]
        if user and user.id in manager.user_connections:
            del manager.user_connections[user.id]
        
        # Clean up class rooms
        for class_id, connections in list(manager.class_rooms.items()):
            if connection_id in connections:
                connections.discard(connection_id)
            if not connections:
                del manager.class_rooms[class_id]
        
        if user and user.id in manager.user_classes:
            del manager.user_classes[user.id]
        
        logger.info(f"WebSocket cleaned up: connection={connection_id}")


@router.get("/ws/stats")
async def get_websocket_stats() -> dict:
    """Get WebSocket connection statistics."""
    return {
        "total_connections": len(manager.active_connections),
        "total_users": len(manager.user_connections),
        "total_class_rooms": len(manager.class_rooms),
        "class_rooms": {cid: len(conns) for cid, conns in manager.class_rooms.items()}
    }