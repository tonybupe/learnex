# ── Development stage ─────────────────────────────────────────────────────────
FROM python:3.12-slim-bookworm AS development

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev bash \
    && rm -rf /var/lib/apt/lists/*

COPY apps/api/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r /tmp/requirements.txt

COPY apps/api /app
CMD ["celery", "-A", "app.tasks.celery_app.celery_app", "worker", "--loglevel=info"]

# ── Production stage ──────────────────────────────────────────────────────────
FROM python:3.12-slim-bookworm AS production

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY apps/api/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r /tmp/requirements.txt

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

COPY apps/api /app
RUN chown -R appuser:appgroup /app

USER appuser
CMD ["celery", "-A", "app.tasks.celery_app.celery_app", "worker", "--loglevel=info", "--concurrency=4"]
