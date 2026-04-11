# backend/websocket/manager.py
import json
import asyncio
import logging
from datetime import datetime
from typing import Dict, Set, Optional, List
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections with class-based rooms."""
    
    def __init__(self):
        # Active connections: connection_id -> WebSocket
        self.active_connections: Dict[str, WebSocket] = {}
        # User ID -> connection_id
        self.user_connections: Dict[int, str] = {}
        # Class ID -> set of connection_ids
        self.class_rooms: Dict[int, Set[str]] = {}
        # User ID -> set of class_ids they're subscribed to
        self.user_classes: Dict[int, Set[int]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: int, connection_id: str):
        """Accept and store a new WebSocket connection."""
        await websocket.accept()
        
        self.active_connections[connection_id] = websocket
        self.user_connections[user_id] = connection_id
        
        logger.info(f"WebSocket connected: user_id={user_id}, connection_id={connection_id}")
        
        await self.send_personal(connection_id, {
            "type": "connection",
            "status": "connected",
            "user_id": user_id,
            "message": "Connected to Learnex WebSocket",
            "timestamp": datetime.now().isoformat()
        })
    
    def disconnect(self, connection_id: str):
        """Remove a disconnected WebSocket."""
        # Find user_id from connection
        user_id = None
        for uid, cid in list(self.user_connections.items()):  # Use list to avoid dict size change
            if cid == connection_id:
                user_id = uid
                break
        
        # Remove from active connections
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
        
        # Remove from user connections
        if user_id and user_id in self.user_connections:
            del self.user_connections[user_id]
        
        # Remove from class rooms and track empty rooms
        rooms_to_clean = []
        for class_id, connections in self.class_rooms.items():
            if connection_id in connections:
                connections.discard(connection_id)
            if not connections:
                rooms_to_clean.append(class_id)
        
        # Clean up empty rooms
        for class_id in rooms_to_clean:
            del self.class_rooms[class_id]
        
        # Remove user's class subscriptions
        if user_id and user_id in self.user_classes:
            del self.user_classes[user_id]
        
        logger.info(f"WebSocket disconnected: connection_id={connection_id}, user_id={user_id}")
    
    async def join_class(self, connection_id: str, class_id: int, user_id: int):
        """Subscribe a connection to a class room."""
        if class_id not in self.class_rooms:
            self.class_rooms[class_id] = set()
        
        self.class_rooms[class_id].add(connection_id)
        
        # Track user's class subscriptions
        if user_id not in self.user_classes:
            self.user_classes[user_id] = set()
        self.user_classes[user_id].add(class_id)
        
        logger.info(f"User {user_id} joined class room {class_id}")
        
        await self.send_personal(connection_id, {
            "type": "class_joined",
            "class_id": class_id,
            "message": f"Joined class {class_id}",
            "timestamp": datetime.now().isoformat()
        })
    
    async def leave_class(self, connection_id: str, class_id: int, user_id: int):
        """Unsubscribe a connection from a class room."""
        if class_id in self.class_rooms:
            self.class_rooms[class_id].discard(connection_id)
            
            # Clean up empty rooms
            if not self.class_rooms[class_id]:
                del self.class_rooms[class_id]
        
        # Update user's class subscriptions
        if user_id in self.user_classes:
            self.user_classes[user_id].discard(class_id)
            if not self.user_classes[user_id]:
                del self.user_classes[user_id]
        
        logger.info(f"User {user_id} left class room {class_id}")
    
    async def send_personal(self, connection_id: str, message: dict):
        """Send a message to a specific connection."""
        if connection_id in self.active_connections:
            try:
                await self.active_connections[connection_id].send_json(message)
            except Exception as e:
                logger.error(f"Error sending personal message to {connection_id}: {e}")
                self.disconnect(connection_id)
    
    async def send_to_user(self, user_id: int, message: dict):
        """Send a message to a specific user."""
        if user_id in self.user_connections:
            connection_id = self.user_connections[user_id]
            await self.send_personal(connection_id, message)
    
    async def send_to_class(self, class_id: int, message: dict, exclude_connection: Optional[str] = None):
        """Broadcast a message to all connections in a class."""
        if class_id in self.class_rooms:
            # Use list() to create a snapshot of connections to avoid modification during iteration
            for connection_id in list(self.class_rooms[class_id]):
                if connection_id != exclude_connection:
                    await self.send_personal(connection_id, message)
    
    async def broadcast_to_all(self, message: dict):
        """Broadcast a message to all active connections."""
        for connection_id in list(self.active_connections.keys()):
            await self.send_personal(connection_id, message)
    
    async def handle_ping(self, connection_id: str, data: dict):
        """Handle ping message."""
        await self.send_personal(connection_id, {
            "type": "pong",
            "timestamp": data.get("timestamp", datetime.now().isoformat())
        })
    
    async def handle_message(self, connection_id: str, data: dict):
        """Process incoming WebSocket messages."""
        message_type = data.get("type")
        
        if message_type == "ping":
            await self.handle_ping(connection_id, data)
        
        elif message_type == "join_class":
            class_id = data.get("class_id")
            user_id = data.get("user_id")
            if class_id and user_id:
                await self.join_class(connection_id, class_id, user_id)
        
        elif message_type == "leave_class":
            class_id = data.get("class_id")
            user_id = data.get("user_id")
            if class_id and user_id:
                await self.leave_class(connection_id, class_id, user_id)

    async def send_to_class_with_retry(self, class_id: int, message: dict, max_retries: int = 2):
        """Send to class with retry logic."""
        if class_id not in self.class_rooms:
            return
        
        for connection_id in list(self.class_rooms[class_id]):
            retries = 0
            while retries < max_retries:
                try:
                    await self.send_personal(connection_id, message)
                    break
                except Exception as e:
                    retries += 1
                    if retries >= max_retries:
                        logger.error(f"Failed to send message to {connection_id} after {max_retries} retries: {e}")
                        self.disconnect(connection_id)
                    await asyncio.sleep(0.1)
    
    async def get_connection_stats(self) -> dict:
        """Get current connection statistics."""
        return {
            "total_connections": len(self.active_connections),
            "total_users": len(self.user_connections),
            "total_class_rooms": len(self.class_rooms),
            "class_rooms": {cid: len(conns) for cid, conns in self.class_rooms.items()},
            "user_classes": {uid: list(classes) for uid, classes in self.user_classes.items()}
        }


# Global manager instance
manager = ConnectionManager()