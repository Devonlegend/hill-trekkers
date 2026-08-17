import asyncpg
from app.config import settings

pool: asyncpg.Pool | None = None


async def init_db_pool():
    global pool
    pool = await asyncpg.create_pool(
        dsn=settings.database_url,
        min_size=settings.db_pool_min,
        max_size=settings.db_pool_max,
        command_timeout=settings.db_statement_timeout_ms / 1000,
    )


async def close_db_pool():
    global pool
    if pool is not None:
        await pool.close()
        pool = None


async def get_db():
    async with pool.acquire() as conn:
        yield conn