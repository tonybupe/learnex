# app/main.py
import logging
import os
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import Base, engine
from app.middleware.logging import RequestLoggingMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.models import (
    User, Follow, Subject, ClassRoom, ClassMember, Post, Lesson, LiveSession,
    SessionAttendance, LessonResource, Quiz, QuizQuestion, QuizOption,
    QuizAttempt, Notification, reminder, MediaFile, Conversation,
    ConversationParticipant, Message, ModerationAction, AuditLog, Report, UserProfile
)
from app.websocket.routes import router as websocket_router
from app.websocket.manager import manager
from app.deps import get_current_user

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s - %(message)s",
    datefmt="%H:%M:%S",
)

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    openapi_url="/api/v1/openapi.json",
    docs_url="/api/v1/docs",
    redoc_url="/api/v1/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitMiddleware, calls=100, period=60, redis_url=settings.redis_url)

# API Routes
app.include_router(api_router, prefix="/api/v1")

# WebSocket
app.include_router(websocket_router)


@app.on_event("startup")
async def startup_event():
    """Mount uploads directory on startup - safe for testing environments."""
    from pathlib import Path
    from fastapi.staticfiles import StaticFiles
    upload_dir = settings.upload_dir
    try:
        Path(upload_dir).mkdir(parents=True, exist_ok=True)
        Path("uploads/images").mkdir(parents=True, exist_ok=True)
        app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")
    except Exception as e:
        logging.warning(f"Uploads disabled: {e}")


@app.get("/api/v1/websocket/stats")
async def websocket_stats(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return await manager.get_connection_stats()


@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "healthy",
        "websocket": {
            "endpoint": "/ws",
            "active_connections": len(manager.active_connections),
            "connected_users": len(manager.user_connections),
            "active_rooms": len(manager.class_rooms),
        },
    }


@app.get("/")
def root():
    return {
        "message": "Welcome to Learnex API",
        "version": "0.1.0",
        "docs": "/api/v1/docs",
        "websocket": "ws://localhost:8000/ws?token=YOUR_JWT_TOKEN",
    }
