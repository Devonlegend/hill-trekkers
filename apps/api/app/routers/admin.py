from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
import asyncpg
from app.db import get_db
from app.deps import get_current_user, require_role
from app.schemas.admin import (
    CategoryCreate,
    CategoryUpdate,
    TripCreate,
    TripUpdate,
    PricingTiersPut,
    RoleUpdate,
    PostStatusUpdate,
    ReportStatusUpdate,
)
from app.services.paystack import refund_transaction

router = APIRouter()


async def _fetch_trip_or_404(conn, trip_id: str):
    trip = await conn.fetchrow("SELECT * FROM trips WHERE id = $1", trip_id)
    if not trip:
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "Trip not found."})
    return trip


def _check_trip_ownership(trip: asyncpg.Record, user) -> None:
    if user["role"] != "admin" and str(trip["created_by"]) != str(user["id"]):
        raise HTTPException(403, detail={"code": "FORBIDDEN", "message": "You can only manage trips you created."})


# ---- Categories ----

@router.post("/api/admin/categories", status_code=201)
async def create_category(
    body: CategoryCreate,
    user=Depends(require_role(["admin"])),
    conn: asyncpg.Connection = Depends(get_db),
):
    row = await conn.fetchrow(
        """
        INSERT INTO trip_categories (name, slug, description, cover_image_url, sort_order)
        VALUES ($1, $2, $3, $4, $5) RETURNING *
        """,
        body.name,
        body.slug,
        body.description,
        body.cover_image_url,
        body.sort_order,
    )
    return dict(row) | {"id": str(row["id"])}


@router.patch("/api/admin/categories/{category_id}")
async def update_category(
    category_id: str,
    body: CategoryUpdate,
    user=Depends(require_role(["admin"])),
    conn: asyncpg.Connection = Depends(get_db),
):
    fields = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if fields:
        sets = ", ".join(f"{k} = ${i+1}" for i, k in enumerate(fields))
        args = list(fields.values()) + [category_id]
        await conn.execute(
            f"UPDATE trip_categories SET {sets} WHERE id = ${len(args)}", *args
        )
    return {"ok": True}


# ---- Trips ----

@router.post("/api/admin/trips", status_code=201)
async def create_trip(
    body: TripCreate,
    user=Depends(require_role(["trip_leader", "admin"])),
    conn: asyncpg.Connection = Depends(get_db),
):
    row = await conn.fetchrow(
        """
        INSERT INTO trips (
          category_id, title, slug, summary, description, itinerary,
          location, meeting_point, difficulty, distance_km,
          start_date, end_date, capacity, status, cover_image_url, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
        """,
        body.category_id,
        body.title,
        body.slug,
        body.summary,
        body.description,
        body.itinerary,
        body.location,
        body.meeting_point,
        body.difficulty,
        body.distance_km,
        body.start_date,
        body.end_date,
        body.capacity,
        body.status,
        body.cover_image_url,
        user["id"],
    )
    for i, url in enumerate(body.media_urls):
        await conn.execute(
            "INSERT INTO trip_media (trip_id, media_url, sort_order) VALUES ($1, $2, $3)",
            row["id"], url, i + 1,
        )
    return dict(row) | {"id": str(row["id"]), "media": body.media_urls}


@router.patch("/api/admin/trips/{trip_id}")
async def update_trip(
    trip_id: str,
    body: TripUpdate,
    user=Depends(require_role(["trip_leader", "admin"])),
    conn: asyncpg.Connection = Depends(get_db),
):
    trip = await _fetch_trip_or_404(conn, trip_id)
    _check_trip_ownership(trip, user)
    fields = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    fields.pop("media_urls", None)
    if fields:
        sets = ", ".join(f"{k} = ${i+1}" for i, k in enumerate(fields))
        args = list(fields.values()) + [trip_id]
        await conn.execute(
            f"UPDATE trips SET {sets} WHERE id = ${len(args)}", *args
        )
    if body.media_urls is not None:
        async with conn.transaction():
            await conn.execute(
                "DELETE FROM trip_media WHERE trip_id = $1", trip_id
            )
            for i, url in enumerate(body.media_urls):
                await conn.execute(
                    "INSERT INTO trip_media (trip_id, media_url, sort_order) VALUES ($1, $2, $3)",
                    trip_id, url, i + 1,
                )
    return {"ok": True}


@router.put("/api/admin/trips/{trip_id}/pricing-tiers")
async def replace_pricing_tiers(
    trip_id: str,
    body: PricingTiersPut,
    user=Depends(require_role(["trip_leader", "admin"])),
    conn: asyncpg.Connection = Depends(get_db),
):
    trip = await _fetch_trip_or_404(conn, trip_id)
    _check_trip_ownership(trip, user)

    if not body.tiers:
        raise HTTPException(400, detail={"code": "AT_LEAST_ONE_TIER", "message": "A trip needs at least one pricing tier."})

    tiers = []
    for t in body.tiers:
        try:
            valid_from = datetime.fromisoformat(t.valid_from)
            valid_until = datetime.fromisoformat(t.valid_until)
        except ValueError:
            raise HTTPException(400, detail={"code": "BAD_DATE", "message": "Tier dates must be ISO 8601."})
        # TIMESTAMPTZ comparison vs get_active_tier(now(utc)) requires aware datetimes
        if valid_from.tzinfo is None:
            valid_from = valid_from.replace(tzinfo=timezone.utc)
        if valid_until.tzinfo is None:
            valid_until = valid_until.replace(tzinfo=timezone.utc)
        if valid_until <= valid_from:
            raise HTTPException(400, detail={"code": "BAD_DATE_RANGE", "message": "Tier valid_until must be after valid_from."})
        tiers.append((t.tier_name, t.price_kobo, valid_from, valid_until, t.seat_cap))

    # Book-referenced tiers are preserved; their time windows must also be
    # treated as blocked so a replacement can't create two active tiers at once.
    referenced = await conn.fetch(
        "SELECT DISTINCT tier_id FROM bookings WHERE trip_id = $1", trip_id
    )
    referenced_ids = [str(r["tier_id"]) for r in referenced]
    blocked: list[tuple] = []
    if referenced_ids:
        ref_rows = await conn.fetch(
            """
            SELECT valid_from, valid_until FROM trip_pricing_tiers
            WHERE trip_id = $1 AND id = ANY($2::uuid[])
            """,
            trip_id,
            referenced_ids,
        )
        blocked = [(None, None, r["valid_from"], r["valid_until"], None) for r in ref_rows]

    candidates = tiers + blocked
    for a in candidates:
        for b in candidates:
            if a is b:
                continue
            # Overlap: max(from) < min(until) with equal bounds treated as overlap
            lo = max(a[2], b[2])
            hi = min(a[3], b[3])
            if lo < hi or (a[2] == b[2] and a[3] == b[3]):
                raise HTTPException(
                    409,
                    detail={"code": "OVERLAPPING_TIERS", "message": "Pricing tiers must not overlap in time."},
                )

    async with conn.transaction():
        if referenced_ids:
            await conn.execute(
                "DELETE FROM trip_pricing_tiers WHERE trip_id = $1 AND NOT (id = ANY($2::uuid[]))",
                trip_id,
                referenced_ids,
            )
        else:
            await conn.execute(
                "DELETE FROM trip_pricing_tiers WHERE trip_id = $1", trip_id
            )
        for i, (name, price, vf, vu, cap) in enumerate(tiers):
            await conn.execute(
                """
                INSERT INTO trip_pricing_tiers (trip_id, tier_name, price_kobo, valid_from, valid_until, seat_cap, sort_order)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                """,
                trip_id, name, price, vf, vu, cap, i + 1,
            )
    return {"ok": True}


@router.get("/api/admin/trips/{trip_id}")
async def admin_get_trip(
    trip_id: str,
    user=Depends(require_role(["trip_leader", "admin"])),
    conn: asyncpg.Connection = Depends(get_db),
):
    trip = await _fetch_trip_or_404(conn, trip_id)
    if user["role"] != "admin" and str(trip["created_by"]) != str(user["id"]):
        raise HTTPException(403, detail={"code": "FORBIDDEN", "message": "You can only manage trips you created."})
    tiers = await conn.fetch(
        "SELECT * FROM trip_pricing_tiers WHERE trip_id = $1 ORDER BY sort_order ASC", trip_id
    )
    data = dict(trip) | {"id": str(trip["id"])}
    data["pricing_tiers"] = [
        dict(t)
        | {
            "id": str(t["id"]),
            "valid_from": t["valid_from"].isoformat(),
            "valid_until": t["valid_until"].isoformat(),
        }
        for t in tiers
    ]
    media = await conn.fetch(
        "SELECT * FROM trip_media WHERE trip_id = $1 ORDER BY sort_order ASC", trip_id
    )
    data["media"] = [dict(m) | {"id": str(m["id"])} for m in media]
    return data


@router.get("/api/admin/trips")
async def admin_list_trips(
    user=Depends(require_role(["trip_leader", "admin"])),
    conn: asyncpg.Connection = Depends(get_db),
):
    if user["role"] == "admin":
        rows = await conn.fetch(
            """
            SELECT t.*, c.name AS category_name FROM trips t
            JOIN trip_categories c ON c.id = t.category_id
            ORDER BY t.start_date DESC
            """
        )
    else:
        rows = await conn.fetch(
            """
            SELECT t.*, c.name AS category_name FROM trips t
            JOIN trip_categories c ON c.id = t.category_id
            WHERE t.created_by = $1
            ORDER BY t.start_date DESC
            """,
            user["id"],
        )
    return [dict(r) | {"id": str(r["id"])} for r in rows]


# ---- Bookings / refunds ----

@router.get("/api/admin/bookings")
async def admin_list_bookings(
    status: str | None = None,
    trip_id: str | None = None,
    user=Depends(require_role(["trip_leader", "admin"])),
    conn: asyncpg.Connection = Depends(get_db),
):
    sql = """
        SELECT b.*, u.full_name AS user_name, u.email AS user_email,
               t.title AS trip_title, tt.tier_name,
               p.paystack_reference, p.status AS payment_status
        FROM bookings b
        JOIN users u ON u.id = b.user_id
        JOIN trips t ON t.id = b.trip_id
        JOIN trip_pricing_tiers tt ON tt.id = b.tier_id
        LEFT JOIN payments p ON p.booking_id = b.id
        WHERE 1=1
    """
    args = []
    if status:
        args.append(status)
        sql += f" AND b.status = ${len(args)}"
    if trip_id:
        args.append(trip_id)
        sql += f" AND b.trip_id = ${len(args)}"
    if user["role"] != "admin":
        args.append(user["id"])
        sql += f" AND t.created_by = ${len(args)}"
    sql += " ORDER BY b.created_at DESC"
    rows = await conn.fetch(sql, *args)
    return [dict(r) | {"id": str(r["id"])} for r in rows]


@router.post("/api/admin/bookings/{booking_id}/refund")
async def refund_booking(
    booking_id: str,
    user=Depends(require_role(["admin"])),
    conn: asyncpg.Connection = Depends(get_db),
):
    booking = await conn.fetchrow("SELECT * FROM bookings WHERE id = $1", booking_id)
    if not booking:
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "Booking not found."})
    if booking["status"] != "confirmed":
        raise HTTPException(409, detail={"code": "NOT_CONFIRMED", "message": "Only confirmed bookings can be refunded."})
    payment = await conn.fetchrow(
        "SELECT * FROM payments WHERE booking_id = $1 AND status = 'success'", booking_id
    )
    if not payment:
        raise HTTPException(409, detail={"code": "NO_PAID_PAYMENT", "message": "No successful payment found for this booking."})

    await refund_transaction(payment["paystack_reference"])

    async with conn.transaction():
        # Conditional update makes a concurrent refund a no-op instead of a
        # double DB refund (Paystack itself dedupes by transaction reference).
        updated = await conn.execute(
            "UPDATE bookings SET status = 'refunded' WHERE id = $1 AND status = 'confirmed'",
            booking_id,
        )
        if updated == "UPDATE 0":
            raise HTTPException(
                409,
                detail={"code": "ALREADY_REFUNDED", "message": "This booking has already been refunded."},
            )
        await conn.execute(
            "UPDATE trips SET seats_booked = GREATEST(seats_booked - $2, 0) WHERE id = $1",
            booking["trip_id"],
            booking["seats"],
        )
    return {"ok": True}


# ---- Community moderation ----

@router.get("/api/admin/reports")
async def admin_list_reports(
    status: str = "open",
    user=Depends(require_role(["admin"])),
    conn: asyncpg.Connection = Depends(get_db),
):
    rows = await conn.fetch(
        """
        SELECT r.*, u.full_name AS reporter_name,
               p.caption AS post_caption, p.author_id AS post_author_id,
               c.body AS comment_body
        FROM reports r
        LEFT JOIN users u ON u.id = r.reported_by
        LEFT JOIN posts p ON p.id = r.post_id
        LEFT JOIN comments c ON c.id = r.comment_id
        WHERE r.status = $1
        ORDER BY r.created_at DESC
        """,
        status,
    )
    return [dict(r) | {"id": str(r["id"])} for r in rows]


@router.patch("/api/admin/posts/{post_id}")
async def moderate_post(
    post_id: str,
    body: PostStatusUpdate,
    user=Depends(require_role(["admin"])),
    conn: asyncpg.Connection = Depends(get_db),
):
    await conn.execute("UPDATE posts SET status = $1 WHERE id = $2", body.status, post_id)
    return {"ok": True}


@router.patch("/api/admin/reports/{report_id}")
async def update_report(
    report_id: str,
    body: ReportStatusUpdate,
    user=Depends(require_role(["admin"])),
    conn: asyncpg.Connection = Depends(get_db),
):
    await conn.execute("UPDATE reports SET status = $1 WHERE id = $2", body.status, report_id)
    return {"ok": True}


# ---- Users / roles ----

@router.get("/api/admin/users")
async def admin_list_users(
    user=Depends(require_role(["admin"])),
    conn: asyncpg.Connection = Depends(get_db),
):
    rows = await conn.fetch(
        """
        SELECT id, full_name, email, phone, role, email_verified, is_active, created_at
        FROM users ORDER BY created_at DESC
        """
    )
    return [
        dict(r)
        | {
            "id": str(r["id"]),
            "email_verified": bool(r["email_verified"]),
            "is_active": bool(r["is_active"]),
            "created_at": r["created_at"].isoformat(),
        }
        for r in rows
    ]


@router.patch("/api/admin/users/{user_id}/role")
async def update_role(
    user_id: str,
    body: RoleUpdate,
    user=Depends(require_role(["admin"])),
    conn: asyncpg.Connection = Depends(get_db),
):
    if str(user["id"]) == user_id:
        raise HTTPException(400, detail={"code": "CANNOT_CHANGE_OWN_ROLE", "message": "You cannot change your own role."})
    await conn.execute("UPDATE users SET role = $1 WHERE id = $2", body.role, user_id)
    return {"ok": True}
