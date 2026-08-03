import asyncpg
from app.config import settings

pool: asyncpg.Pool | None = None


async def init_db_pool():
    global pool
    pool = await asyncpg.create_pool(
        dsn=settings.database_url, min_size=2, max_size=10
    )


async def close_db_pool():
    global pool
    if pool is not None:
        await pool.close()
        pool = None


async def get_db():
    async with pool.acquire() as conn:
        yield conn