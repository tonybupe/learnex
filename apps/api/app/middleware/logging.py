"""Request logging middleware - logs method, path, status, duration, request ID."""
import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import logging

logger = logging.getLogger("learnex.http")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        logger.info(
            f"{request.method} {request.url.path} "
            f"-> {response.status_code} ({duration_ms}ms) "
            f"[{request_id[:8]}]"
        )
        response.headers["X-Request-ID"] = request_id
        return response
