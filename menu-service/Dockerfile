# Dockerfile — Menu Service (Python / FastAPI)
#
# Single-stage build for Python (simpler than Node.js multi-stage
# because pip doesn't have a devDependencies equivalent to exclude).
#
# SECURITY:
#   - python:3.11-slim base (smaller attack surface than full python image)
#   - Non-root user runs the application
#   - No .env files copied into the image

FROM python:3.11-slim

# Install wget for the HEALTHCHECK command
# Clean up apt cache immediately to keep image small
RUN apt-get update \
    && apt-get install -y --no-install-recommends wget \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user to run the application
# Using a fixed UID (1001) is a best practice for container security
RUN useradd -m -u 1001 appuser

WORKDIR /app

# Copy requirements FIRST — Docker layer cache means pip install only
# re-runs when requirements.txt changes, not on every code change
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY app/ ./app/

# Transfer ownership of the app directory to our non-root user
RUN chown -R appuser:appuser /app

# Switch to non-root user — all subsequent commands run as appuser
USER appuser

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8001/health || exit 1

# Start uvicorn — the ASGI server that runs FastAPI
# --host 0.0.0.0 means listen on all network interfaces (required in Docker)
# --port 8001 matches the EXPOSE above
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]


