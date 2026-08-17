import hmac
import hashlib
import json
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, Response
import asyncpg
from app.config import settings
from app.db import get_db
from app.deps import get_current_user
from app.services.paystack import verify_transaction, refund_transaction
from app.services.mailer import send_booking_confirmation_email

router = APIRouter()
logger = logging.getLogger("hilltrekkers.payments")


@router.post("/api/payments/webhook")
async def paystack_webhook(
    request: Request, conn: asyncpg.Connection = Depends(get_db)
):
    raw_body = await request.body()
    signature = request.headers.get("x-paystack-signature")

    expected_hash = hmac.new(
        settings.paystack_secret_key.encode("utf-8"),
        raw_body,
        hashlib.sha512,
    ).hexdigest()

    if not signature or not hmac.compare_digest(expected_hash, signature):
        raise HTTPException(401, detail={"code": "INVALID_SIGNATURE", "message": "Invalid signature."})

    event = json.loads(raw_body)

    if event.get("event") == "charge.success":
        await _handle_charge_success(event, conn)
    elif event.get("event") == "charge.failed":
        await conn.execute(
            "UPDATE payments SET status = 'failed' WHERE paystack_reference = $1 AND status <> 'success'",
            event["data"]["reference"],
        )

    return Response(status_code=200)


async def _confirm_payment(
    payment: asyncpg.Record, conn: asyncpg.Connection, event: dict | None = None
) -> asyncpg.Record | None:
    """Idempotently mark a payment + booking confirmed and credit trip seats.

    Runs inside its own (nested) transaction. Returns the now-confirmed booking,
    or None when a concurrent webhook/verify already handled this payment so
    seats are only ever credited once.
    """
    async with conn.transaction():
        updated = await conn.execute(
            "UPDATE payments SET status = 'success', paid_at = now() WHERE id = $1 AND status <> 'success' RETURNING id",
            payment["id"],
        )
        if updated != "UPDATE 1":
            return None
        if event is not None:
            await conn.execute(
                "UPDATE payments SET raw_webhook_payload = $1 WHERE id = $2",
                json.dumps(event),
                payment["id"],
            )
        booking = await conn.fetchrow(
            "UPDATE bookings SET status = 'confirmed' WHERE id = $1 AND status = 'pending' RETURNING *",
            payment["booking_id"],
        )
        if not booking:
            # The booking is no longer pending: it was already confirmed, or its
            # 20-minute hold expired (release_expired_holds job) and the seats
            # were re-sold. In the expired case the customer paid but holds no
            # seat, so refund them; never silently confirm without a seat.
            await _refund_unconfirmable(payment, conn)
            return None
        # Capacity + pending holds are reserved at booking creation, so the
        # guard below never trips in the normal flow; it exists so a stray
        # re-confirm can never violate the CHECK constraint / 500 the webhook.
        credited = await conn.execute(
            "UPDATE trips SET seats_booked = seats_booked + $2 WHERE id = $1 AND seats_booked + $2 <= capacity",
            booking["trip_id"],
            booking["seats"],
        )
        if credited == "UPDATE 0":
            logger.critical(
                "SEAT CREDIT FAILED for payment %s: trip over capacity",
                payment["paystack_reference"],
            )
            return None
    return booking


async def _refund_unconfirmable(payment: asyncpg.Record, conn: asyncpg.Connection) -> None:
    """Best-effort refund for a captured charge whose booking can no longer be confirmed.

    Runs after the payment row is already marked 'success' inside the caller's
    transaction. If the refund fails we still mark the payment failed and log so
    an operator can recover manually; the important invariant is that a booking
    is never confirmed without a seat.
    """
    try:
        await refund_transaction(payment["paystack_reference"])
    except Exception:  # noqa: BLE001
        logger.exception(
            "REFUND_FAILED for unconfirmable payment %s — manual intervention required",
            payment["paystack_reference"],
        )
    await conn.execute(
        "UPDATE payments SET status = 'failed' WHERE id = $1 AND status = 'success'",
        payment["id"],
    )
    logger.warning("REFUNDED unconfirmable payment %s", payment["paystack_reference"])


async def _handle_charge_success(event: dict, conn: asyncpg.Connection):
    reference = event["data"]["reference"]

    verified = await verify_transaction(reference)
    if verified["status"] != "success":
        return

    payment = await conn.fetchrow(
        "SELECT * FROM payments WHERE paystack_reference = $1", reference
    )
    if not payment:
        return
    if payment["status"] == "success":
        return

    if verified["amount"] != payment["amount_kobo"]:
        logger.warning(
            "AMOUNT MISMATCH for %s: paystack=%s expected=%s",
            reference, verified["amount"], payment["amount_kobo"],
        )
        return

    booking = await _confirm_payment(payment, conn, event)
    if booking is None:
        return

    user = await conn.fetchrow("SELECT email FROM users WHERE id = $1", booking["user_id"])
    if user:
        trip = await conn.fetchrow("SELECT title FROM trips WHERE id = $1", booking["trip_id"])
        await send_booking_confirmation_email(
            {"user_email": user["email"], "trip_title": trip["title"] if trip else "your trek"}
        )


@router.get("/api/payments/verify/{reference}")
async def verify_payment(
    reference: str,
    user=Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db),
):
    payment = await conn.fetchrow(
        "SELECT * FROM payments WHERE paystack_reference = $1", reference
    )
    if not payment:
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "Payment not found."})

    booking = await conn.fetchrow("SELECT * FROM bookings WHERE id = $1", payment["booking_id"])
    if str(booking["user_id"]) != str(user["id"]) and user["role"] != "admin":
        raise HTTPException(403, detail={"code": "FORBIDDEN", "message": "Not your payment."})

    try:
        verified = await verify_transaction(reference)
    except RuntimeError:
        verified = {"status": "failed", "amount": 0}

    # Spec rule: payment status becomes 'success' after either a verified
    # webhook OR a manual Verify call returning success. This is the fallback
    # that recovers a booking when the webhook was missed.
    if (
        verified["status"] == "success"
        and verified.get("amount") == payment["amount_kobo"]
        and payment["status"] != "success"
    ):
        await _confirm_payment(payment, conn)

    booking = await conn.fetchrow("SELECT * FROM bookings WHERE id = $1", payment["booking_id"])
    payment = await conn.fetchrow(
        "SELECT * FROM payments WHERE paystack_reference = $1", reference
    )

    return {
        "status": verified["status"],
        "paid_at": payment["paid_at"],
        "booking": dict(booking),
    }
