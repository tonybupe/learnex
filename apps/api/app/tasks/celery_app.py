from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "learnex_worker",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.task_routes = {
    "app.tasks.*": {"queue": "learnex-default"}
}