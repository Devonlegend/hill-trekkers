import logging

import httpx

from app.config import settings

logger = logging.getLogger("hilltrekkers.mailer")


async def send_email(to: str, subject: str, html: str) -> None:
    """Send a transactional email via Brevo when configured, else log (dev)."""
    api_key = settings.email_provider_api_key
    if not api_key or api_key.startswith("xxx"):
        logger.info("DEV_EMAIL to=%s subject=%s body=%s", to, subject, html)
        return
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={
                "api-key": api_key,
                "Content-Type": "application/json",
            },
            json={
                "sender": {"email": settings.email_from_address, "name": "Hill Trekkers Club"},
                "to": [{"email": to}],
                "subject": subject,
                "htmlContent": html,
            },
        )
    if res.status_code >= 400:
        logger.error("EMAIL_SEND_FAILED status=%s body=%s", res.status_code, res.text)
        return
    logger.info("EMAIL_SENT to=%s subject=%s", to, subject)


async def send_verification_email(to: str, verify_url: str) -> None:
    await send_email(
        to,
        "Verify your Hill Trekkers Club email",
        f'<p>Welcome to The Hill Trekkers Club!</p>'
        f'<p>Click below to verify your email:</p>'
        f'<p><a href="{verify_url}">Verify my email</a></p>',
    )


async def send_password_reset_email(to: str, reset_url: str) -> None:
    await send_email(
        to,
        "Reset your Hill Trekkers Club password",
        f'<p>We received a request to reset your password.</p>'
        f'<p><a href="{reset_url}">Reset password</a></p>'
        f'<p>If you didn\'t request this, you can ignore this email.</p>',
    )


async def send_booking_confirmation_email(booking: dict) -> None:
    await send_email(
        booking.get("user_email") or "member@hilltrekkersclub.com",
        "Booking confirmed",
        f"<p>Your booking is confirmed.</p>"
        f"<p>Trip: {booking.get('trip_title', 'Trek')}</p>"
        f"<p>See you on the trail!</p>",
    )