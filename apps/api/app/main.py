from contextlib import asynccontextmanager
import logging

import asyncpg
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings, enforce_production_settings
from app import db
from app.jobs.release_expired_holds import release_expired_holds
from app.logging_config import configure_logging
from app.routers import auth, profile, trips, bookings, payments, community, admin, uploads

scheduler = AsyncIOScheduler()

logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging(settings.log_level)
    enforce_production_settings()
    await db.init_db_pool()

    async def job():
        async with db.pool.acquire() as conn:
            await release_expired_holds(conn)

    scheduler.add_job(job, "interval", minutes=5)
    scheduler.start()

    yield

    scheduler.shutdown()
    await db.close_db_pool()


app = FastAPI(
    title="The Hill Trekkers Club API",
    lifespan=lifespan,
    # Don't expose interactive API docs in production.
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)

if settings.cors_origin_list:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.get("/health", tags=["ops"])
async def health() -> dict:
    """Liveness probe."""
    return {"status": "ok", "environment": settings.environment}


@app.get("/health/ready", tags=["ops"])
async def health_ready() -> dict:
    """Readiness probe — verifies the DB pool can serve a query."""
    if db.pool is None:
        raise HTTPException(503, detail={"code": "DB_UNAVAILABLE", "message": "DB pool not initialized."})
    try:
        async with db.pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(503, detail={"code": "DB_UNAVAILABLE", "message": str(exc)}) from exc
    return {"status": "ready"}


@app.exception_handler(asyncpg.exceptions.DataError)
async def data_error_handler(request, exc):  # noqa: ANN001
    """Malformed input (e.g. a non-UUID id) is a client error, not a 500."""
    logger.error(
        "asyncpg DataError on %s %s :: %s",
        request.method,
        request.url.path,
        str(exc),
    )
    return JSONResponse(
        status_code=400,
        content={"detail": {"code": "BAD_INPUT", "message": "Malformed request data."}},
    )


@app.exception_handler(asyncpg.exceptions.UniqueViolationError)
async def unique_violation_handler(request, exc):  # noqa: ANN001
    return JSONResponse(
        status_code=409,
        content={"detail": {"code": "CONFLICT", "message": "That resource already exists."}},
    )


@app.exception_handler(asyncpg.exceptions.ForeignKeyViolationError)
async def fk_violation_handler(request, exc):  # noqa: ANN001
    return JSONResponse(
        status_code=400,
        content={"detail": {"code": "INVALID_REFERENCE", "message": "Referenced resource does not exist."}},
    )


for r in (auth.router, profile.router, trips.router, bookings.router, payments.router, community.router, admin.router, uploads.router):
    app.include_router(r)

# The mock Paystack checkout only exists for local development where real
# Paystack keys are not configured. It must never be reachable in production —
# mock mode uses a publicly-known webhook signature secret.
if not settings.is_production:
    from app.routers import mock_paystack

    app.include_router(mock_paystack.router)
    uploads.mount_static_uploads(app)
