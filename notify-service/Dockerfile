# notify-service/Dockerfile
#
# Single-stage build using Python Alpine — no ncurses vulnerability.
# Same reasoning as menu-service/Dockerfile.

FROM python:3.11-alpine

RUN apk add --no-cache gcc musl-dev wget

RUN adduser -D -u 1001 appuser

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8002

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://0.0.0.0:8002/health | grep -q "ok" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002"]
