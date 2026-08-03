# Paystack Integration — Reference Implementation (FastAPI)

Stack: **FastAPI** + **asyncpg** (raw SQL matching `01-database-schema.sql` 1:1) + **httpx** for
outbound calls to Paystack. Swap `asyncpg` calls for SQLAlchemy async if the team prefers an ORM —
the SQL itself doesn't change.

**Golden rules (unchanged regardless of stack)**
- The Paystack **secret key never touches the frontend**. All Paystack API calls are server-to-server.
- Money is always in **kobo** (Naira × 100) when talking to Paystack, and stored as kobo in the DB.
- Payment status is only trusted from a **verified webhook** or a call to the **Verify Transaction**
  endpoint — never from the browser's redirect alone.

---

## 1. Environment variables

```
PAYSTACK_SECRET_KEY=sk_live_xxx   (sk_test_xxx in dev)
PAYSTACK_PUBLIC_KEY=pk_live_xxx
APP_BASE_URL=https://hilltrekkersclub.com
```

Loaded via a Pydantic `Settings` class (`app/config.py`):

```python
# app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    jwt_expires_minutes: int = 60 * 24 * 7
    paystack_secret_key: str
    paystack_public_key: str
    app_base_url: str

    class Config:
        env_file = ".env"

settings = Settings()
```

---

## 2. Database connection (`app/db.py`)

```python
# app/db.py
import asyncpg
from app.config import settings

pool: asyncpg.Pool | None = None

async def init_db_pool():
    global pool
    pool = await asyncpg.create_pool(dsn=settings.database_url, min_size=2, max_size=10)

async def close_db_pool():
    await pool.close()

async def get_db():
    async with pool.acquire() as conn:
        yield conn
```

Wire `init_db_pool`/`close_db_pool` into FastAPI's lifespan in `main.py`:

```python
# app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.db import init_db_pool, close_db_pool

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db_pool()
    yield
    await close_db_pool()

app = FastAPI(lifespan=lifespan)
```

---

## 3. Pricing tier resolution (`app/services/pricing.py`)

```python
# app/services/pricing.py
from datetime import datetime, timezone
import asyncpg

async def get_active_tier(conn: asyncpg.Connection, trip_id: str, at_time: datetime | None = None):
    at_time = at_time or datetime.now(timezone.utc)
    row = await conn.fetchrow(
        """
        SELECT * FROM trip_pricing_tiers
        WHERE trip_id = $1 AND valid_from <= $2 AND valid_until > $2
        ORDER BY sort_order ASC
        LIMIT 1
        """,
        trip_id, at_time,
    )
    return row  # None means no tier is currently active
```

This function is the single source of truth for "what does this trip cost right now." Both the trip
detail endpoint (for display) and the booking endpoint (for the actual charge) call it — but only the
booking endpoint's result is ever persisted.

---

## 4. Paystack API client wrapper (`app/services/paystack.py`)

```python
# app/services/paystack.py
import httpx
from app.config import settings

PAYSTACK_BASE = "https://api.paystack.co"

async def initialize_transaction(email: str, amount_kobo: int, reference: str,
                                  callback_url: str, metadata: dict) -> dict:
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{PAYSTACK_BASE}/transaction/initialize",
            headers={"Authorization": f"Bearer {settings.paystack_secret_key}"},
            json={
                "email": email,
                "amount": amount_kobo,   # smallest currency unit, per Paystack's API
                "reference": reference,
                "callback_url": callback_url,
                "metadata": metadata,
            },
        )
    data = res.json()
    if not data.get("status"):
        raise RuntimeError(data.get("message", "Paystack initialize failed"))
    return data["data"]  # { authorization_url, access_code, reference }

async def verify_transaction(reference: str) -> dict:
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{PAYSTACK_BASE}/transaction/verify/{reference}",
            headers={"Authorization": f"Bearer {settings.paystack_secret_key}"},
        )
    data = res.json()
    if not data.get("status"):
        raise RuntimeError(data.get("message", "Paystack verify failed"))
    return data["data"]  # includes status: 'success' | 'failed' | 'abandoned', amount, etc.
```

---

## 5. Create a booking + start payment (`app/routers/bookings.py`)

```python
# app/routers/bookings.py
import uuid
from fastapi import APIRouter, Depends, HTTPException
import asyncpg
from app.db import get_db
from app.deps import get_current_user, require_email_verified
from app.services.pricing import get_active_tier
from app.services.paystack import initialize_transaction
from app.schemas.booking import BookingCreate
from app.config import settings

router = APIRouter()

@router.post("/api/bookings", status_code=201)
async def create_booking(
    body: BookingCreate,
    user=Depends(get_current_user),
    _=Depends(require_email_verified),
    conn: asyncpg.Connection = Depends(get_db),
):
    async with conn.transaction():
        # Lock the trip row so two concurrent bookings can't both overbook the last seat
        trip = await conn.fetchrow(
            "SELECT * FROM trips WHERE id = $1 AND status = 'published' FOR UPDATE",
            body.trip_id,
        )
        if not trip:
            raise HTTPException(404, detail={"code": "TRIP_NOT_FOUND"})

        if trip["seats_booked"] + body.seats > trip["capacity"]:
            raise HTTPException(409, detail={"code": "TRIP_SOLD_OUT", "message": "Not enough seats remaining."})

        tier = await get_active_tier(conn, body.trip_id)
        if not tier:
            raise HTTPException(409, detail={"code": "NO_ACTIVE_PRICING", "message": "This trip is not currently open for booking."})

        price_locked_kobo = tier["price_kobo"] * body.seats
        reference = f"htc_{uuid.uuid4()}"

        booking = await conn.fetchrow(
            """
            INSERT INTO bookings (user_id, trip_id, tier_id, price_locked_kobo, seats, status, hold_expires_at)
            VALUES ($1, $2, $3, $4, $5, 'pending', now() + interval '20 minutes')
            RETURNING *
            """,
            user["id"], body.trip_id, tier["id"], price_locked_kobo, body.seats,
        )

        paystack_data = await initialize_transaction(
            email=user["email"],
            amount_kobo=price_locked_kobo,
            reference=reference,
            callback_url=f"{settings.app_base_url}/dashboard/bookings/{booking['id']}/confirm",
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
            booking["id"], reference, price_locked_kobo, paystack_data["authorization_url"],
        )

    return {
        "booking": dict(booking),
        "payment": {"reference": reference, "authorization_url": paystack_data["authorization_url"]},
    }
```

`BookingCreate` schema (`app/schemas/booking.py`):

```python
from pydantic import BaseModel, Field

class BookingCreate(BaseModel):
    trip_id: str
    seats: int = Field(default=1, ge=1)
```

Note: `FOR UPDATE` inside the transaction block is what actually prevents the "two people booking the
last seat simultaneously" race — without it, both requests can read `seats_booked` before either
writes, and both succeed.

---

## 6. Webhook handler — the source of truth (`app/routers/payments.py`)

FastAPI needs the **raw bytes** of the request body to compute the HMAC — don't accept a Pydantic
model as the parameter for this route, or the raw body will already be consumed/parsed.

```python
# app/routers/payments.py
import hmac
import hashlib
import json
from fastapi import APIRouter, Request, Response, Depends, HTTPException
import asyncpg
from app.db import get_db
from app.config import settings
from app.services.paystack import verify_transaction
from app.services.mailer import send_booking_confirmation_email

router = APIRouter()

@router.post("/api/payments/webhook")
async def paystack_webhook(request: Request, conn: asyncpg.Connection = Depends(get_db)):
    raw_body = await request.body()
    signature = request.headers.get("x-paystack-signature")

    expected_hash = hmac.new(
        settings.paystack_secret_key.encode("utf-8"),
        raw_body,
        hashlib.sha512,
    ).hexdigest()

    if not signature or not hmac.compare_digest(expected_hash, signature):
        raise HTTPException(401, detail="Invalid signature")

    event = json.loads(raw_body)

    # Acknowledge quickly; Paystack expects a 200 within a few seconds.
    # For heavier processing, hand off to a background task/queue here instead of awaiting inline.
    if event.get("event") == "charge.success":
        await _handle_charge_success(event, conn)
    elif event.get("event") == "charge.failed":
        await conn.execute(
            "UPDATE payments SET status = 'failed' WHERE paystack_reference = $1",
            event["data"]["reference"],
        )

    return Response(status_code=200)


async def _handle_charge_success(event: dict, conn: asyncpg.Connection):
    reference = event["data"]["reference"]

    # Re-verify with Paystack directly rather than trusting the webhook payload alone.
    verified = await verify_transaction(reference)
    if verified["status"] != "success":
        return

    payment = await conn.fetchrow("SELECT * FROM payments WHERE paystack_reference = $1", reference)
    if not payment:
        return  # unknown reference — ignore
    if payment["status"] == "success":
        return  # already processed — idempotent, avoid double-crediting

    if verified["amount"] != payment["amount_kobo"]:
        # Log and flag for manual review — do NOT auto-confirm a mismatched amount.
        print(f"AMOUNT MISMATCH for {reference}: paystack={verified['amount']} expected={payment['amount_kobo']}")
        return

    async with conn.transaction():
        await conn.execute(
            "UPDATE payments SET status = 'success', paid_at = now(), raw_webhook_payload = $2 WHERE id = $1",
            payment["id"], json.dumps(event),
        )
        booking = await conn.fetchrow(
            "UPDATE bookings SET status = 'confirmed' WHERE id = $1 RETURNING *",
            payment["booking_id"],
        )
        await conn.execute(
            "UPDATE trips SET seats_booked = seats_booked + $2 WHERE id = $1",
            booking["trip_id"], booking["seats"],
        )

    await send_booking_confirmation_email(booking)
```

**Why verify again inside the webhook instead of trusting `event["data"]` directly?**
The safest pattern for money — signature-check → call Verify Transaction → compare the amount before
crediting anything — defends against a stale or tampered payload passing signature checks due to a
key leak, and against integration bugs applying a wrong amount.

**FastAPI-specific gotcha:** if you have global body-parsing middleware or use `Request` after another
dependency has already called `await request.json()`, `await request.body()` here can return empty
bytes. Keep this route free of any dependency that touches the body before this handler does.

---

## 7. Manual verify endpoint (fallback / confirmation page)

```python
# app/routers/payments.py (continued)
@router.get("/api/payments/verify/{reference}")
async def verify_payment(reference: str, user=Depends(get_current_user), conn: asyncpg.Connection = Depends(get_db)):
    verified = await verify_transaction(reference)
    payment = await conn.fetchrow("SELECT * FROM payments WHERE paystack_reference = $1", reference)
    if not payment:
        raise HTTPException(404, detail={"code": "NOT_FOUND"})

    booking = await conn.fetchrow("SELECT * FROM bookings WHERE id = $1", payment["booking_id"])
    if booking["user_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(403, detail={"code": "FORBIDDEN"})

    return {"status": verified["status"], "booking": dict(booking)}
```

The frontend's post-payment "confirm" page (`/dashboard/bookings/:id/confirm`) calls this on load so
the member sees an accurate status even if the webhook hasn't landed yet — but the webhook remains
what actually flips the booking to `confirmed` in the database.

---

## 8. Releasing expired holds (scheduled job)

For most club-sized traffic, an in-process scheduler is simplest. Move to Celery/Arq + Redis only if
booking volume grows enough to need a separate worker process.

```python
# app/jobs/release_expired_holds.py
import asyncpg

async def release_expired_holds(conn: asyncpg.Connection):
    await conn.execute(
        """
        UPDATE bookings SET status = 'expired'
        WHERE status = 'pending' AND hold_expires_at < now()
        """
    )
```

Wired up with `APScheduler` in `main.py`:

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.jobs.release_expired_holds import release_expired_holds
from app.db import pool

scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db_pool()

    async def job():
        async with pool.acquire() as conn:
            await release_expired_holds(conn)

    scheduler.add_job(job, "interval", minutes=5)
    scheduler.start()

    yield
    scheduler.shutdown()
    await close_db_pool()
```

Because `seats_booked` is only ever incremented on confirmed payment (§6), expired pending bookings
don't need to "give back" a seat — they never took one in the persistent count. This keeps the seat
math simple and avoids race conditions between concurrent bookings.

---

## 9. Frontend checkout trigger (Next.js / React)

Assumes the `next.config.js` rewrite from `00-README.md`, so `/api/*` is same-origin from the
browser's point of view and the auth cookie travels automatically.

```jsx
async function handleBookAndPay(tripId) {
  const res = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ trip_id: tripId, seats: 1 }),
  });
  const data = await res.json();
  if (!res.ok) return showError(data.detail?.message ?? 'Something went wrong');

  // Redirect the browser to Paystack's hosted checkout
  window.location.href = data.payment.authorization_url;

  // Alternative: use Paystack Popup (inline checkout) instead of a redirect,
  // passing data.payment access_code if you initialize with Popup V2.
}
```

Never construct or send an `amount` from this frontend call — it is intentionally omitted from
`BookingCreate` in §5; the backend is the only place amount is decided.

---

## 10. Registering the webhook URL with Paystack

In the Paystack dashboard (Settings → API Keys & Webhooks), set the webhook URL to
`https://<your-fastapi-domain>/api/payments/webhook` — **note this must point at the FastAPI service
directly** (or through the Next.js rewrite proxy, either works since the proxy forwards the raw body).
Test and live modes have separate webhook URLs — configure both. Paystack retries failed deliveries
for up to 72 hours, so make the handler idempotent (§6 already handles this via the
`payment["status"] == "success"` check).
