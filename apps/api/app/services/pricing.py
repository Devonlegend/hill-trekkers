from datetime import datetime, timezone
import asyncpg


async def get_active_tier(
    conn: asyncpg.Connection, trip_id: str, at_time: datetime | None = None
):
    at_time = at_time or datetime.now(timezone.utc)
    return await conn.fetchrow(
        """
        SELECT * FROM trip_pricing_tiers
        WHERE trip_id = $1 AND valid_from <= $2 AND valid_until > $2
        ORDER BY sort_order ASC
        LIMIT 1
        """,
        trip_id,
        at_time,
    )
