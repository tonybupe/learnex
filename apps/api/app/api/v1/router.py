from fastapi import APIRouter

from app.api.v1.routes import uploads
from app.api.v1.routes import (
    analytics,
    auth,
    classes,
    discovery,
    follows,
    health,
    lessons,
    live_sessions,
    media_files,
    messaging,
    moderation,
    notifications,
    posts,
    quizzes,
    search,
    subjects,
    users,
)

api_router = APIRouter()
api_router.include_router(uploads.router, prefix="/uploads", tags=["uploads"])
api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(follows.router, prefix="/social", tags=["Social"])
api_router.include_router(subjects.router, prefix="/subjects", tags=["Subjects"])
api_router.include_router(classes.router, prefix="/classes", tags=["Classes"])
api_router.include_router(posts.router, prefix="/posts", tags=["Posts"])
api_router.include_router(lessons.router, prefix="/lessons", tags=["Lessons"])
api_router.include_router(quizzes.router, prefix="/quizzes", tags=["Quizzes"])
api_router.include_router(live_sessions.router, prefix="/live-sessions", tags=["Live Sessions"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(media_files.router, prefix="/media", tags=["Media"])
api_router.include_router(search.router, prefix="/search", tags=["Search"])
api_router.include_router(discovery.router, prefix="/discovery", tags=["Discovery"])
api_router.include_router(messaging.router, prefix="/messaging", tags=["Messaging"])
api_router.include_router(moderation.router, prefix="/moderation", tags=["Moderation"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])