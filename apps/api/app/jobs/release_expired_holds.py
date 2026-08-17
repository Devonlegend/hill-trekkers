import asyncpg


async def release_expired_holds(conn: asyncpg.Connection) -> None:
    # Expired unpaid bookings release their seat hold; their pending payment
    # rows are closed too so the dashboard stops showing a perpetual 'pending'.
    async with conn.transaction():
        await conn.execute(
            """
            WITH expired AS (
                UPDATE bookings SET status = 'expired'
                WHERE status = 'pending' AND hold_expires_at < now()
                RETURNING id
            )
            UPDATE payments SET status = 'failed'
            WHERE status = 'pending' AND booking_id IN (SELECT id FROM expired)
            """
        )