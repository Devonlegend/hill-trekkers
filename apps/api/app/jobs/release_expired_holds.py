import asyncpg


async def release_expired_holds(conn: asyncpg.Connection) -> None:
    await conn.execute(
        """
        UPDATE bookings SET status = 'expired'
        WHERE status = 'pending' AND hold_expires_at < now()
        """
    )