"""Redis sliding-window rate limiter. Fails open if Redis is unavailable."""
import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from fastapi.responses import JSONResponse

logger = logging.getLogger("learnex.rate_limit")

EXEMPT_PATHS = {"/api/v1/health", "/", "/uploads"}
_redis = None


def _get_redis(redis_url: str):
    global _redis
    if _redis is None:
        try:
            import redis
            _redis = redis.from_url(redis_url, decode_responses=True)
        except Exception:
            pass
    return _redis


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, calls: int = 100, period: int = 60, redis_url: str = "redis://redis:6379/0"):
        super().__init__(app)
        self.calls = calls
        self.period = period
        self.redis_url = redis_url

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.url.path in EXEMPT_PATHS or request.url.path.startswith("/uploads"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        key = f"rate_limit:{client_ip}"

        try:
            r = _get_redis(self.redis_url)
            if r:
                now = time.time()
                pipe = r.pipeline()
                pipe.zremrangebyscore(key, 0, now - self.period)
                pipe.zadd(key, {str(now): now})
                pipe.zcard(key)
                pipe.expire(key, self.period)
                results = pipe.execute()
                count = results[2]
                if count > self.calls:
                    logger.warning(f"Rate limit exceeded for {client_ip}")
                    return JSONResponse(
                        status_code=429,
                        content={"detail": "Too many requests. Please slow down."},
                        headers={"Retry-After": str(self.period)},
                    )
                response = await call_next(request)
                response.headers["X-RateLimit-Limit"] = str(self.calls)
                response.headers["X-RateLimit-Remaining"] = str(max(0, self.calls - count))
                return response
        except Exception as exc:
            logger.error(f"Rate limiter error: {exc} - allowing request")

        return await call_next(request)
