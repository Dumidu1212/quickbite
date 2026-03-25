# menu-service/Dockerfile
#
# Single-stage build using Python Alpine — no ncurses vulnerability.
#
# WHY ALPINE?
#   Debian-based Python images (slim, slim-bookworm) ship ncurses which has
#   CVE-2025-69720 (CRITICAL, no fix available in any Debian release as of Sprint 4).
#   Alpine Linux does not include ncurses by default, eliminating this vulnerability.
#   Alpine also produces a smaller image (~50MB vs ~70MB).

FROM python:3.11-alpine

# Install system dependencies.
# gcc and musl-dev are needed to compile Python packages with C extensions.
# wget is needed for the Docker health check.
RUN apk add --no-cache gcc musl-dev wget \
    && adduser -D -u 1001 appuser

WORKDIR /app

# Copy and install Python dependencies first — Docker caches this layer.
# Requirements only reinstall when requirements.txt changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY app/ ./app/

# Set correct ownership
RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://0.0.0.0:8001/health | grep -q "ok" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
