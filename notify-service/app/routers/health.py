# app/routers/health.py
#
# Health check for notify-service.
# Unlike the other services, this service has NO database.
# The health check verifies the service is alive and the
# event consumer (stub for now) is configured.

import time
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.core.config import get_settings

router = APIRouter(tags=["Health"])
settings = get_settings()
START_TIME = time.time()


@router.get("/health")
async def health_check():
    """
    Returns service health.
    Always returns 200 — this service has no database dependency.
    In Sprint 3 we'll add a Service Bus connectivity check.
    """
    return JSONResponse(
        content={
            "status": "ok",
            "service": "notify-service",
            "version": settings.app_version,
            "uptime": int(time.time() - START_TIME),
            # notify-service has no DB — it uses Service Bus for input
            "database": "n/a",
            "consumer": "stub",    # will show "running" in Sprint 3
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
        status_code=200,
    )
