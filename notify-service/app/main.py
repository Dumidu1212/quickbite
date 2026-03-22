# app/main.py — Notify Service application factory

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import health, notify
from app.messaging.service_bus_consumer import start_consumer

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: start the Service Bus consumer as a background task.
    Shutdown: cancel the consumer task cleanly.
    """
    # ── Startup ───────────────────────────────────────────────────────────
    print(f"[Server] {settings.app_name} v{settings.app_version} starting")

    # Start the Service Bus consumer in the background
    # In Sprint 3 this will create a real azure-servicebus connection
    consumer_task = None
    try:
        import asyncio
        consumer_task = asyncio.create_task(start_consumer())
        print("[ServiceBus] Consumer task started")
    except Exception as e:
        print(f"[ServiceBus] WARNING: Could not start consumer: {e}")

    yield  # ← application runs here

    # ── Shutdown ──────────────────────────────────────────────────────────
    if consumer_task and not consumer_task.done():
        consumer_task.cancel()
        print("[ServiceBus] Consumer task cancelled")
    print("[Server] Notify service shut down cleanly")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Email notification microservice for QuickBite. Consumes OrderCreated events from Azure Service Bus.",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(notify.router)
