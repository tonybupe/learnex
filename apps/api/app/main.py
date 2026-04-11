# app/main.py
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi import HTTPException, Depends

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import Base, engine
from app.models import (
    User, Follow, Subject, ClassRoom, ClassMember, Post, Lesson, LiveSession,
    SessionAttendance, LessonResource, Quiz, QuizQuestion, QuizOption,
    QuizAttempt, Notification, reminder, MediaFile, Conversation,
    ConversationParticipant, Message, ModerationAction, AuditLog, Report, UserProfile
)

# Import WebSocket router
from app.websocket.routes import router as websocket_router
from app.websocket.manager import manager
from app.deps import get_current_user

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    openapi_url="/api/v1/openapi.json",
    docs_url="/api/v1/docs",
    redoc_url="/api/v1/redoc",
)

# ----------------------------
# CORS CONFIGURATION (PRO LEVEL)
# ----------------------------

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------
# UPLOADS DIRECTORY
# ----------------------------

Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

# ----------------------------
# API ROUTES
# ----------------------------

app.include_router(api_router, prefix="/api/v1")

# ----------------------------
# WEBSOCKET ROUTES
# ----------------------------

app.include_router(websocket_router)

# ----------------------------
# WEBSOCKET STATS ENDPOINT (ADMIN ONLY)
# ----------------------------

@app.get("/api/v1/websocket/stats")
async def websocket_stats(
    current_user: User = Depends(get_current_user),
):
    """Get WebSocket connection statistics (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    stats = await manager.get_connection_stats()
    return stats

# ----------------------------
# HEALTH CHECK WITH WEBSOCKET STATUS
# ----------------------------

@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint with WebSocket status."""
    return {
        "status": "healthy",
        "websocket": {
            "endpoint": "/ws",
            "active_connections": len(manager.active_connections),
            "connected_users": len(manager.user_connections),
            "active_rooms": len(manager.class_rooms)
        }
    }

# ----------------------------
# ROOT ENDPOINT
# ----------------------------

@app.get("/")
def root():
    return {
        "message": "Welcome to Learnex API",
        "version": "0.1.0",
        "docs": "/api/v1/docs",
        "websocket": "ws://localhost:8000/ws?token=YOUR_JWT_TOKEN"
    }