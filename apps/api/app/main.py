from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app import db
from app.jobs.release_expired_holds import release_expired_holds
from app.routers import auth, profile, trips, bookings, payments, community, admin, mock_paystack, uploads

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.init_db_pool()

    async def job():
        async with db.pool.acquire() as conn:
            await release_expired_holds(conn)

    scheduler.add_job(job, "interval", minutes=5)
    scheduler.start()

    yield

    scheduler.shutdown()
    await db.close_db_pool()


app = FastAPI(title="The Hill Trekkers Club API", lifespan=lifespan)

if settings.cors_origin_list:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

for r in (auth.router, profile.router, trips.router, bookings.router, payments.router, community.router, admin.router, mock_paystack.router, uploads.router):
    app.include_router(r)

uploads.mount_static_uploads(app)
