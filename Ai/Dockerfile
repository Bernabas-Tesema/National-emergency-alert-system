FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    AI_ENV=prod \
    AI_MODE=live \
    PORT=8088 \
    WEB_CONCURRENCY=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 appuser

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY data ./data
RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8088

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-8088}/ai/health" || exit 1

# Render injects PORT. Keep 1 worker on free tier; raise WEB_CONCURRENCY if needed.
CMD ["sh", "-c", "echo Starting EthioAlert AI on port ${PORT:-8088}; uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8088} --workers ${WEB_CONCURRENCY:-1} --proxy-headers --forwarded-allow-ips='*'"]
