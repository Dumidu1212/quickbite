# app/main.py
#
# FastAPI application factory.
#
# IMPORTANT PATTERN — lifespan context manager:
# FastAPI uses a lifespan function for startup/shutdown logic.
# Code BEFORE the yield runs on startup.
# Code AFTER the yield runs on shutdown.
# This replaces the old @app.on_event("startup") decorator.
#
# WHY THIS MATTERS FOR TESTS:
# When pytest imports this module, the lifespan function runs.
# We wrap the DB check in try/except so the app starts even if
# MongoDB isn't available — this lets tests run without a real DB.

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import client
from app.routers import health, restaurants, menu_items

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown logic."""
    # ── Startup ──────────────────────────────────────────────────────────
    print(f"[Server] {settings.app_name} v{settings.app_version} starting")

    try:
        await client.admin.command("ping")
        print("[Database] Connected to MongoDB successfully")
    except Exception as e:
        # Log warning but do not crash — health endpoint reports degraded
        print(f"[Database] WARNING: Could not connect to MongoDB: {e}")

    yield  # ← application runs here

    # ── Shutdown ─────────────────────────────────────────────────────────
    client.close()
    print("[Database] MongoDB connection closed")
    print("[Server] Menu service shut down cleanly")


# Create the FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Restaurant catalog and menu management microservice for QuickBite",
    # /docs is the interactive Swagger UI — always available
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS — allow all origins in development
# In production this is locked to the Azure API Management URL via APIM policy
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
# Each router is a group of related endpoints
app.include_router(health.router)
app.include_router(restaurants.router)
app.include_router(menu_items.router)
