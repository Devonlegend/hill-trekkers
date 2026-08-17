#!/usr/bin/env python3
"""
verify_paystack.py — pre-flight checks before flipping The Hill Trekkers Club
to live Paystack payments.

Run from the apps/api directory (or anywhere — it fixes its own import path).
Uses httpx (already a dependency) so no extra installs are needed.

Subcommands:
  checklist   Print the human go-live checklist (default if none given).
  config      Validate the configured Paystack key against the real Paystack API.
  health      Probe a deployed API's /health and /health/ready endpoints.
  webhook     Confirm the deployed webhook is reachable and signature-guarded.
  e2e         Full test: log in -> book a trip -> pay with a test card -> poll
              until Paystack reports success AND the booking flips to 'confirmed'
              via the webhook (TEST keys only by default).

Examples:
  python scripts/verify_paystack.py checklist
  python scripts/verify_paystack.py config
  python scripts/verify_paystack.py config --secret sk_test_candidate_key
  python scripts/verify_paystack.py health  --api-url https://api.example.com
  python scripts/verify_paystack.py webhook --api-url https://api.example.com
  python scripts/verify_paystack.py e2e --api-url https://api.example.com \
      --email member@example.com --password 'secret' --trip-id <uuid>
"""
from __future__ import annotations

import argparse
import os
import sys
import time
import webbrowser

import httpx

# Make `import app.config` work regardless of the current working directory.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings  # noqa: E402

PAYSTACK_BASE = "https://api.paystack.co"
TEST_CARD = "4084 0840 8408 4081"


# --- helpers -------------------------------------------------------------- #
def _label(ok: bool) -> str:
    return "[OK]  " if ok else "[FAIL]"


def _is_real_key(key: str | None) -> bool:
    return bool(key) and not key.startswith("sk_test_placeholder") and not key.startswith("xxx")


def _key_mode(key: str) -> str:
    if key.startswith("sk_test_"):
        return "TEST"
    if key.startswith("sk_live_"):
        return "LIVE"
    return "UNKNOWN"
# --- checklist ------------------------------------------------------------ #
def cmd_checklist(_args: argparse.Namespace) -> int:
    print(
        """
PAYSTACK GO-LIVE CHECKLIST
==========================
Confirm each step BEFORE flipping to live keys. Run the matching subcommand to
actually verify it (these are not just reminders — they make real checks).

1. Get real Paystack keys
   Dashboard -> Settings -> API & Webhooks. Copy sk_test_... first (test);
   sk_live_... only at launch.
   -> python scripts/verify_paystack.py config

2. Validate the key + confirm mock mode is OFF
   The 'config' command calls the Paystack API to confirm the key works and
   reports whether the app is still in mock (placeholder) mode.
   -> python scripts/verify_paystack.py config
      python scripts/verify_paystack.py config --secret sk_test_candidate_key

3. Deploy the API to a public HTTPS URL
   Paystack CANNOT reach localhost — the webhook must be publicly reachable.
   -> python scripts/verify_paystack.py health --api-url https://api.yoursite.com

4. Confirm the webhook endpoint is deployed + signature-guarded
   A healthy webhook returns HTTP 401 on a bad signature.
   -> python scripts/verify_paystack.py webhook --api-url https://api.yoursite.com
   Then register this EXACT URL in Paystack -> Settings -> Webhooks:
       https://api.yoursite.com/api/payments/webhook

5. Run a full TEST payment end-to-end (no real money)
   -> python scripts/verify_paystack.py e2e --api-url https://api.yoursite.com \\
        --email you@example.com --password '...' --trip-id <uuid>
   Use test card 4084 0840 8408 4081, any CVV, any future expiry, any BVN.
   SUCCESS = Paystack reports 'success' AND the booking flips to 'confirmed'.
   If Paystack is paid but the booking stays 'pending', your webhook is not
   landing — re-check the URL registered in Paystack and the server logs.

6. Only then: switch to sk_live_..., re-run 'config', register the LIVE webhook
   URL in Paystack, and go live.
"""
    )
    return 0


# --- config --------------------------------------------------------------- #
def cmd_config(args: argparse.Namespace) -> int:
    key = args.secret or settings.paystack_secret_key
    print("== Paystack key validation ==")

    if not _is_real_key(key):
        print(f"{_label(False)} No real Paystack key configured (still placeholder/empty).")
        print("       Set PAYSTACK_SECRET_KEY to a real sk_test_... or sk_live_... key,")
        print("       or pass it with --secret to test a candidate key.")
        return 1

    mode = _key_mode(key)
    print(f"{_label(True)} Key is set ({mode} mode).")

    # Validate against the real Paystack API (any authenticated endpoint works).
    try:
        res = httpx.get(
            f"{PAYSTACK_BASE}/transaction?perPage=1",
            headers={"Authorization": f"Bearer {key}"},
            timeout=30,
        )
    except httpx.HTTPError as exc:
        print(f"{_label(False)} Could not reach the Paystack API: {exc}")
        return 1

    if res.status_code == 401:
        print(f"{_label(False)} Paystack rejected this key (401 Unauthorized) — invalid/revoked.")
        return 1
    if res.status_code != 200:
        print(f"{_label(False)} Unexpected Paystack response: HTTP {res.status_code} {res.text[:200]}")
        return 1
    print(f"{_label(True)} Paystack accepted the key (200 OK).")

    # The app's own mock-mode flag reflects the CONFIGURED key (settings), which
    # may differ from a --secret candidate. Be explicit about which we mean.
    configured = settings.paystack_secret_key
    app_mock_on = not _is_real_key(configured)
    print(
        f"{_label(not app_mock_on)} App mock mode (configured key): "
        f"{'OFF' if not app_mock_on else 'ON (server still on placeholder key)'}"
    )
    if args.secret and app_mock_on:
        print("       NOTE: you tested a candidate --secret, but the server is NOT yet")
        print("       configured with it. Set PAYSTACK_SECRET_KEY on the server to make it live.")

    if mode == "LIVE":
        print("[WARN] This is a LIVE key — real money will move. Only use after you have")
        print("       verified the entire flow in TEST mode first.")
    else:
        print(f"[INFO] TEST mode. Use Paystack test card {TEST_CARD}, any CVV, any future expiry.")

    return 0 if not app_mock_on else 1
# --- health --------------------------------------------------------------- #
def cmd_health(args: argparse.Namespace) -> int:
    base = args.api_url.rstrip("/")
    print(f"== API health @ {base} ==")
    overall = True
    for path in ("/health", "/health/ready"):
        try:
            r = httpx.get(f"{base}{path}", timeout=15)
        except httpx.HTTPError as exc:
            print(f"{_label(False)} {path}: unreachable ({exc})")
            overall = False
            continue
        ok = r.status_code == 200
        body = ""
        if r.headers.get("content-type", "").startswith("application/json"):
            try:
                body = r.json()
            except ValueError:
                body = r.text[:120]
        print(f"{_label(ok)} {path}: HTTP {r.status_code} {body}")
        if not ok:
            overall = False
    if overall:
        print("       API is up and the DB pool is serving queries.")
    return 0 if overall else 1


# --- webhook -------------------------------------------------------------- #
def cmd_webhook(args: argparse.Namespace) -> int:
    base = args.api_url.rstrip("/")
    url = f"{base}/api/payments/webhook"
    print(f"== Webhook reachability @ {url} ==")
    try:
        # POST with a deliberately-bogus signature. A guarding endpoint returns 401.
        r = httpx.post(
            url,
            content=b"{}",
            headers={"x-paystack-signature": "bogus", "content-type": "application/json"},
            timeout=15,
        )
    except httpx.HTTPError as exc:
        print(f"{_label(False)} Webhook unreachable ({exc}).")
        print("       Is the API deployed to a public HTTPS URL? Paystack cannot reach localhost.")
        return 1

    if r.status_code == 401:
        print(f"{_label(True)} Webhook reachable and signature-guarded (HTTP 401 on bad signature).")
        print("       Register this EXACT URL in Paystack -> Settings -> Webhooks:")
        print(f"         {url}")
        return 0
    print(f"{_label(False)} Webhook returned HTTP {r.status_code} (expected 401 on a bogus signature).")
    print("       The endpoint may be missing or misconfigured.")
    return 1
# --- e2e ----------------------------------------------------------------- #
def cmd_e2e(args: argparse.Namespace) -> int:
    base = args.api_url.rstrip("/")
    key = settings.paystack_secret_key

    if not _is_real_key(key):
        print(f"{_label(False)} e2e requires a real Paystack key configured on the server.")
        print("       Set PAYSTACK_SECRET_KEY (a real sk_test_... key) on the deployed API first.")
        return 1
    if not key.startswith("sk_test_") and not args.force_live:
        print(f"{_label(False)} Configured key is LIVE. Refusing to run e2e (would charge real money).")
        print("       Re-run with --force-live ONLY if you accept a real card charge.")
        return 1
    if args.force_live and not key.startswith("sk_test_"):
        print("[WARN] --force-live with a LIVE key: a REAL card charge WILL occur.")

    client = httpx.Client(base_url=base, timeout=60)

    # 1. Log in
    print("== 1/4 Logging in ==")
    r = client.post("/api/auth/login", json={"email": args.email, "password": args.password})
    if r.status_code != 200:
        print(f"{_label(False)} Login failed: HTTP {r.status_code} {r.text[:200]}")
        return 1
    print(f"{_label(True)} Logged in as {args.email}.")

    # 2. Create booking
    print("== 2/4 Creating booking ==")
    r = client.post("/api/bookings", json={"trip_id": args.trip_id, "seats": 1})
    if r.status_code != 201:
        body = r.text[:300]
        print(f"{_label(False)} Booking failed: HTTP {r.status_code} {body}")
        if "EMAIL_NOT_VERIFIED" in body:
            print("       This account's email is not verified. Verify it first, or use a verified account.")
        if "NO_ACTIVE_PRICING" in body:
            print("       The trip has no pricing tier valid right now. Pick a trip with an active tier,")
            print("       or adjust its tier valid_from/valid_until in the admin pricing editor.")
        if "TRIP_SOLD_OUT" in body:
            print("       The trip is full. Pick another trip.")
        return 1
    data = r.json()
    booking_id = data["booking"]["id"]
    reference = data["payment"]["reference"]
    auth_url = data["payment"]["authorization_url"]
    print(f"{_label(True)} Booking {booking_id} created. Reference: {reference}")

    # 3. Open Paystack checkout
    print("== 3/4 Complete payment on Paystack ==")
    print(f"  Checkout URL: {auth_url}")
    if not args.no_open:
        try:
            webbrowser.open(auth_url)
        except Exception:  # noqa: BLE001
            pass
    print(f"  Use test card {TEST_CARD}, any CVV, any future expiry, any BVN.")
    print("  Waiting for the webhook to confirm the booking (polling for up to 5 min)...")

    # 4. Poll verify until Paystack=success AND booking=confirmed (webhook landed)
    print("== 4/4 Polling payment + booking status ==")
    deadline = time.time() + 300
    last_pay = last_book = None
    while time.time() < deadline:
        r = client.get(f"/api/payments/verify/{reference}")
        if r.status_code == 200:
            payload = r.json()
            pay_status = payload.get("status")
            booking_status = (payload.get("booking") or {}).get("status")
            if pay_status != last_pay or booking_status != last_book:
                print(f"  paystack={pay_status}  booking={booking_status}")
                last_pay, last_book = pay_status, booking_status
            if pay_status == "success" and booking_status == "confirmed":
                print(f"{_label(True)} Payment SUCCESS and booking CONFIRMED via webhook!")
                print("       The webhook reached your server and credited the seat. Go-live ready.")
                return 0
        time.sleep(3)

    print(f"{_label(False)} Timed out waiting for confirmation.")
    print(f"       Last status: paystack={last_pay}  booking={last_book}")
    print(f"       Reference: {reference}")
    if last_pay == "success" and last_book != "confirmed":
        print("       Paystack recorded SUCCESS but the booking is NOT confirmed.")
        print("       -> Your webhook is not landing on the server.")
        print("       -> Check the webhook URL registered in the Paystack dashboard matches:")
        print(f"          {base}/api/payments/webhook")
        print("       -> Check the API server logs for POST /api/payments/webhook.")
    return 1
# --- argparse wiring ------------------------------------------------------ #
def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Pre-flight checks before going live with Paystack.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = p.add_subparsers(dest="command")

    sub.add_parser("checklist", help="Print the go-live checklist.")

    c = sub.add_parser("config", help="Validate the configured Paystack key.")
    c.add_argument("--secret", help="Test a candidate key without configuring it on the server.")

    h = sub.add_parser("health", help="Probe a deployed API's /health and /health/ready.")
    h.add_argument("--api-url", required=True, help="Deployed API base URL, e.g. https://api.example.com")

    w = sub.add_parser("webhook", help="Confirm the deployed webhook is reachable + guarding.")
    w.add_argument("--api-url", required=True, help="Deployed API base URL, e.g. https://api.example.com")

    e = sub.add_parser("e2e", help="Full end-to-end TEST payment (TEST keys only by default).")
    e.add_argument("--api-url", required=True, help="Deployed API base URL.")
    e.add_argument("--email", required=True, help="A verified member account email.")
    e.add_argument("--password", required=True, help="Account password.")
    e.add_argument("--trip-id", required=True, help="UUID of a published trip with an active pricing tier.")
    e.add_argument("--force-live", action="store_true", help="Allow running against a LIVE key (real charge).")
    e.add_argument("--no-open", action="store_true", help="Don't auto-open the checkout URL in a browser.")

    return p


def main() -> int:
    args = build_parser().parse_args()
    if not args.command:
        return cmd_checklist(args)
    return {
        "checklist": cmd_checklist,
        "config": cmd_config,
        "health": cmd_health,
        "webhook": cmd_webhook,
        "e2e": cmd_e2e,
    }[args.command](args)


if __name__ == "__main__":
    raise SystemExit(main())




