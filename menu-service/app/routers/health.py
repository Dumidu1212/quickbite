# app/routers/health.py
#
# Health endpoint — same purpose as in user-service and order-service.
# FastAPI is async so we check the DB connection with an async ping.
# The endpoint returns 200 if healthy, 503 if MongoDB is unreachable.
# Docker and Azure Container Apps both call this to decide if the
# container should receive traffic.

import time
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.core.config import get_settings
from app.core.database import client

router = APIRouter(tags=["Health"])
settings = get_settings()

# Record the exact moment this module was loaded
# Used to calculate uptime in seconds
START_TIME = time.time()


@router.get("/health")
async def health_check():
    """
    Returns service health status.
    Checks live MongoDB connectivity with a ping command.
    """
    db_connected = False
    try:
        # ping the MongoDB server — fails fast if unreachable (2 second timeout)
        await client.admin.command("ping")
        db_connected = True
    except Exception:
        # Connection failed — we report degraded but do NOT crash
        # The service is still running, just without a database
        db_connected = False

    uptime_seconds = int(time.time() - START_TIME)

    health_data = {
        "status": "ok" if db_connected else "degraded",
        "service": "menu-service",
        "version": settings.app_version,
        "uptime": uptime_seconds,
        "database": "connected" if db_connected else "disconnected",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    # 200 = healthy, 503 = degraded but running
    return JSONResponse(
        content=health_data,
        status_code=200 if db_connected else 503,
    )
