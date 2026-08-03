import logging

logger = logging.getLogger("hilltrekkers.mailer")


async def send_email(to: str, subject: str, text: str) -> None:
    # v1: log the email. Swap in a real transactional provider SDK here.
    logger.info("ENV_EMAIL to=%s subject=%s body=%s", to, subject, text)


async def send_verification_email(to: str, verify_url: str) -> None:
    await send_email(
        to,
        "Verify your Hill Trekkers Club email",
        f"Click to verify your email: {verify_url}",
    )


async def send_password_reset_email(to: str, reset_url: str) -> None:
    await send_email(
        to,
        "Reset your Hill Trekkers Club password",
        f"Click to reset your password: {reset_url}",
    )


async def send_booking_confirmation_email(booking: dict) -> None:
    await send_email(
        booking.get("user_email") or "member@hilltrekkersclub.com",
        "Booking confirmed",
        f"Your booking is confirmed (trip: {booking.get('trip_title', 'Trek')}).",
    )