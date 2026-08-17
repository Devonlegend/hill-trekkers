import uuid
from fastapi import APIRouter, Depends, HTTPException
import asyncpg
from app.config import settings
from app.db import get_db
from app.deps import get_current_user, require_email_verified
from app.schemas.booking import BookingCreate
from app.services.pricing import get_active_tier
from app.services.paystack import initialize_transaction
from app.services.ratelimit import rate_limit

router = APIRouter()


@router.post("/api/bookings", status_code=201)
async def create_booking(
    body: BookingCreate,
    user=Depends(get_current_user),
    _=Depends(require_email_verified),
    _rl=Depends(rate_limit(10, 60)),
    conn: asyncpg.Connection = Depends(get_db),
):
    async with conn.transaction():
        trip = await conn.fetchrow(
            "SELECT * FROM trips WHERE id = $1 AND status = 'published' FOR UPDATE",
            body.trip_id,
        )
        if not trip:
            raise HTTPException(404, detail={"code": "TRIP_NOT_FOUND", "message": "Trip not found."})

        # Pending (unpaid) bookings hold their seats until expiry, so they must
        # count against capacity too — otherwise two holds can both pay and the
        # second confirm would over-sell the trip.
        reserved = await conn.fetchval(
            """
            SELECT COALESCE(SUM(b.seats), 0)
            FROM bookings b
            WHERE b.trip_id = $1 AND b.status = 'pending'
            """,
            body.trip_id,
        )
        if trip["seats_booked"] + reserved + body.seats > trip["capacity"]:
            raise HTTPException(
                409, detail={"code": "TRIP_SOLD_OUT", "message": "Not enough seats remaining."}
            )

        tier = await get_active_tier(conn, body.trip_id)
        if not tier:
            raise HTTPException(
                409, detail={"code": "NO_ACTIVE_PRICING", "message": "This trip is not currently open for booking."}
            )

        # Per-tier seat cap (optional "Early Bird" limited batch, etc.)
        if tier["seat_cap"] is not None:
            tier_used = await conn.fetchval(
                """
                SELECT COALESCE(SUM(b.seats), 0)
                FROM bookings b
                WHERE b.trip_id = $1 AND b.tier_id = $2
                  AND b.status IN ('pending', 'confirmed')
                """,
                body.trip_id,
                tier["id"],
            )
            if tier_used + body.seats > tier["seat_cap"]:
                raise HTTPException(
                    409,
                    detail={"code": "TIER_CAP_REACHED", "message": "This pricing tier's limited seats are booked out."},
                )

        price_locked_kobo = tier["price_kobo"] * body.seats
        reference = f"htc_{uuid.uuid4().hex}"

        booking = await conn.fetchrow(
            """
            INSERT INTO bookings (user_id, trip_id, tier_id, price_locked_kobo, seats, status, hold_expires_at)
            VALUES ($1, $2, $3, $4, $5, 'pending', now() + interval '20 minutes')
            RETURNING *
            """,
            user["id"],
            body.trip_id,
            tier["id"],
            price_locked_kobo,
            body.seats,
        )

        paystack_data = await initialize_transaction(
            email=user["email"],
            amount_kobo=price_locked_kobo,
            reference=reference,
            callback_url=f"{settings.app_base_url}/dashboard/bookings/{booking['id']}/confirm?reference={reference}",
            metadata={
                "booking_id": str(booking["id"]),
                "trip_id": str(body.trip_id),
                "user_id": str(user["id"]),
                "tier_name": tier["tier_name"],
            },
        )

        await conn.execute(
            """
            INSERT INTO payments (booking_id, paystack_reference, amount_kobo, status, paystack_authorization_url)
            VALUES ($1, $2, $3, 'pending', $4)
            """,
            booking["id"],
            reference,
            price_locked_kobo,
            paystack_data["authorization_url"],
        )

    return {
        "booking": {
            "id": str(booking["id"]),
            "status": booking["status"],
            "price_locked_kobo": booking["price_locked_kobo"],
            "seats": booking["seats"],
        },
        "payment": {
            "reference": reference,
            "authorization_url": paystack_data["authorization_url"],
        },
    }


@router.get("/api/bookings/me")
async def my_bookings(
    user=Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db),
):
    rows = await conn.fetch(
        """
        SELECT b.*, t.title AS trip_title, t.slug AS trip_slug, t.cover_image_url,
               t.start_date, t.location, tt.tier_name,
               p.paystack_reference, p.status AS payment_status, p.paid_at
        FROM bookings b
        JOIN trips t ON t.id = b.trip_id
        JOIN trip_pricing_tiers tt ON tt.id = b.tier_id
        LEFT JOIN payments p ON p.booking_id = b.id
        WHERE b.user_id = $1
        ORDER BY b.created_at DESC
        """,
        user["id"],
    )
    return [
        dict(r)
        | {
            "id": str(r["id"]),
            "start_date": r["start_date"].isoformat() if r["start_date"] else None,
        }
        for r in rows
    ]


@router.get("/api/bookings/{booking_id}")
async def get_booking(
    booking_id: str,
    user=Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db),
):
    row = await conn.fetchrow(
        """
        SELECT b.*, t.title AS trip_title, t.slug AS trip_slug, t.cover_image_url,
               t.start_date, t.location, tt.tier_name,
               p.paystack_reference, p.status AS payment_status, p.paid_at
        FROM bookings b
        JOIN trips t ON t.id = b.trip_id
        JOIN trip_pricing_tiers tt ON tt.id = b.tier_id
        LEFT JOIN payments p ON p.booking_id = b.id
        WHERE b.id = $1
        """,
        booking_id,
    )
    if not row:
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "Booking not found."})
    if str(row["user_id"]) != str(user["id"]) and user["role"] != "admin":
        raise HTTPException(403, detail={"code": "FORBIDDEN", "message": "Not your booking."})
    data = dict(row) | {"id": str(row["id"])}
    data["start_date"] = row["start_date"].isoformat() if row["start_date"] else None
    return data
