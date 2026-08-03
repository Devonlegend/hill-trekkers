from fastapi import APIRouter, Depends, HTTPException
import asyncpg
from app.db import get_db
from app.services.pricing import get_active_tier

router = APIRouter()


def _trip_summary(r: asyncpg.Record, tier) -> dict:
    return {
        "id": str(r["id"]),
        "title": r["title"],
        "slug": r["slug"],
        "summary": r["summary"],
        "cover_image_url": r["cover_image_url"],
        "start_date": r["start_date"].isoformat() if r["start_date"] else None,
        "difficulty": r["difficulty"],
        "distance_km": float(r["distance_km"]) if r["distance_km"] is not None else None,
        "seats_booked": r["seats_booked"],
        "capacity": r["capacity"],
        "location": r["location"],
        "active_tier": dict(tier) | {"id": str(tier["id"])} if tier else None,
    }


@router.get("/api/categories")
async def list_categories(conn: asyncpg.Connection = Depends(get_db)):
    rows = await conn.fetch(
        "SELECT * FROM trip_categories ORDER BY sort_order ASC, name ASC"
    )
    return [dict(r) | {"id": str(r["id"])} for r in rows]


@router.get("/api/categories/{slug}")
async def get_category(slug: str, conn: asyncpg.Connection = Depends(get_db)):
    row = await conn.fetchrow("SELECT * FROM trip_categories WHERE slug = $1", slug)
    if not row:
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "Category not found."})
    return dict(row) | {"id": str(row["id"])}


@router.get("/api/categories/{slug}/trips")
async def list_category_trips(
    slug: str,
    conn: asyncpg.Connection = Depends(get_db),
):
    cat = await conn.fetchrow("SELECT * FROM trip_categories WHERE slug = $1", slug)
    if not cat:
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "Category not found."})
    rows = await conn.fetch(
        """
        SELECT * FROM trips
        WHERE category_id = $1 AND status = 'published'
        ORDER BY start_date ASC
        """,
        cat["id"],
    )
    result = []
    for r in rows:
        tier = await get_active_tier(conn, str(r["id"]))
        result.append(_trip_summary(r, tier))
    return result


@router.get("/api/trips/calendar")
async def trip_calendar(
    from_: str | None = None,
    to: str | None = None,
    conn: asyncpg.Connection = Depends(get_db),
):
    sql = """
        SELECT t.id, t.title, t.slug, t.start_date, t.end_date, c.slug AS category_slug,
               t.seats_booked, t.capacity
        FROM trips t JOIN trip_categories c ON c.id = t.category_id
        WHERE t.status = 'published'
    """
    conds = []
    args = []
    if from_:
        args.append(from_)
        conds.append(f"t.start_date >= ${len(args)}")
    if to:
        args.append(to)
        conds.append(f"t.start_date <= ${len(args)}")
    if conds:
        sql += " AND " + " AND ".join(conds)
    sql += " ORDER BY t.start_date ASC"
    rows = await conn.fetch(sql, *args)
    return [
        dict(r)
        | {
            "id": str(r["id"]),
            "start_date": r["start_date"].isoformat() if r["start_date"] else None,
        }
        for r in rows
    ]


@router.get("/api/trips")
async def list_trips(
    upcoming: bool = False,
    limit: int = 20,
    conn: asyncpg.Connection = Depends(get_db),
):
    params: list = []
    sql = """
        SELECT t.*, c.name AS category_name, c.slug AS category_slug
        FROM trips t JOIN trip_categories c ON c.id = t.category_id
        WHERE t.status = 'published'
    """
    if upcoming:
        sql += " AND t.start_date >= CURRENT_DATE"
    sql += " ORDER BY t.start_date ASC"
    if limit:
        params.append(limit)
        sql += f" LIMIT ${len(params)}"
    rows = await conn.fetch(sql, *params)
    result = []
    for r in rows:
        tier = await get_active_tier(conn, str(r["id"]))
        item = _trip_summary(r, tier)
        item["category_slug"] = r["category_slug"]
        item["category_name"] = r["category_name"]
        result.append(item)
    return result


@router.get("/api/trips/{slug}")
async def get_trip(slug: str, conn: asyncpg.Connection = Depends(get_db)):
    trip = await conn.fetchrow(
        "SELECT * FROM trips WHERE slug = $1 AND status IN ('published', 'closed')", slug
    )
    if not trip:
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "Trip not found."})
    tiers = await conn.fetch(
        "SELECT * FROM trip_pricing_tiers WHERE trip_id = $1 ORDER BY sort_order ASC, valid_from ASC",
        trip["id"],
    )
    media = await conn.fetch(
        "SELECT * FROM trip_media WHERE trip_id = $1 ORDER BY sort_order ASC", trip["id"]
    )
    active = await get_active_tier(conn, str(trip["id"]))
    data = _trip_summary(trip, active)
    data["category_id"] = str(trip["category_id"])
    data["description"] = trip["description"]
    data["itinerary"] = trip["itinerary"]
    data["meeting_point"] = trip["meeting_point"]
    data["end_date"] = trip["end_date"].isoformat() if trip["end_date"] else None
    data["status"] = trip["status"]
    data["media"] = [dict(m) | {"id": str(m["id"])} for m in media]
    data["pricing_tiers"] = [dict(t) | {"id": str(t["id"])} for t in tiers]
    data["seats_remaining"] = trip["capacity"] - trip["seats_booked"]
    return data
