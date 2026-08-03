import hmac
import hashlib
import json
from fastapi import APIRouter, Depends, HTTPException, Request, Response
import asyncpg
from app.config import settings
from app.db import get_db
from app.deps import get_current_user
from app.services.paystack import verify_transaction
from app.services.mailer import send_booking_confirmation_email

router = APIRouter()


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
            "UPDATE payments SET status = 'failed' WHERE paystack_reference = $1",
            event["data"]["reference"],
        )

    return Response(status_code=200)


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
        print(f"AMOUNT MISMATCH for {reference}: paystack={verified['amount']} expected={payment['amount_kobo']}")
        return

    async with conn.transaction():
        await conn.execute(
            "UPDATE payments SET status = 'success', paid_at = now(), raw_webhook_payload = $2 WHERE id = $1",
            payment["id"],
            json.dumps(event),
        )
        booking = await conn.fetchrow(
            "UPDATE bookings SET status = 'confirmed' WHERE id = $1 RETURNING *",
            payment["booking_id"],
        )
        await conn.execute(
            "UPDATE trips SET seats_booked = seats_booked + $2 WHERE id = $1",
            booking["trip_id"],
            booking["seats"],
        )

    user = await conn.fetchrow("SELECT email FROM users WHERE id = $1", booking["user_id"])
    await send_booking_confirmation_email(
        {"user_email": user["email"], "trip_title": str(booking["id"])}
    )


@router.get("/api/payments/verify/{reference}")
async def verify_payment(
    reference: str,
    user=Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db),
):
    verified = await verify_transaction(reference)
    payment = await conn.fetchrow(
        "SELECT * FROM payments WHERE paystack_reference = $1", reference
    )
    if not payment:
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "Payment not found."})

    booking = await conn.fetchrow("SELECT * FROM bookings WHERE id = $1", payment["booking_id"])
    if str(booking["user_id"]) != str(user["id"]) and user["role"] != "admin":
        raise HTTPException(403, detail={"code": "FORBIDDEN", "message": "Not your payment."})

    return {"status": verified["status"], "booking": dict(booking)}
