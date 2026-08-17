import json

from fastapi import APIRouter
from fastapi.responses import HTMLResponse, RedirectResponse

from app import db
from app.config import settings
from app.services.paystack import mock_mark_success, is_mock_mode

router = APIRouter()

_MOCK_HTML = """
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Mock Paystack Checkout</title>
  <style>
    body{font-family:system-ui,sans-serif;background:#f7f5f0;display:grid;place-items:center;min-height:100vh;margin:0}
    .card{background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:16px;padding:32px;max-width:400px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.05)}
    h1{color:#1e3a2f;font-size:22px;margin:0 0 8px}
    p{color:#444;font-size:14px}
    button{margin-top:16px;background:#c97b3d;color:#fff;border:0;border-radius:9999px;padding:12px 24px;font-size:14px;font-weight:600;cursor:pointer}
  </style>
</head>
<body>
  <div class="card">
    <h1>Mock Paystack Checkout</h1>
    <p>No real payment will be taken. Click below to simulate a successful payment and return to the site.</p>
    <button onclick="complete()">Simulate successful payment</button>
  </div>
  <script>
    async function complete() {
      document.querySelector('button').disabled = true;
      document.querySelector('button').textContent = 'Processing…';
      await fetch('/api/mock/paystack/complete?reference=' + encodeURIComponent(%REFERENCE%), { method: 'POST' });
      window.location.href = %CALLBACK%;
    }
  </script>
</body>
</html>
"""


@router.get("/api/mock/checkout")
async def mock_checkout(reference: str, callback: str):
    if not is_mock_mode():
        return RedirectResponse(url=callback)
    html = _MOCK_HTML.replace("%REFERENCE%", json.dumps(reference)).replace("%CALLBACK%", json.dumps(callback))
    return HTMLResponse(content=html)


@router.post("/api/mock/paystack/complete")
async def mock_paystack_complete(reference: str):
    if not is_mock_mode():
        return {"ok": True}
    mock_mark_success(reference)
    # Invoke the real webhook handler directly instead of HTTP-looping back to
    # ourselves (which breaks behind a reverse proxy / multiple workers). This
    # path is dev-only: is_mock_mode() is never True in production because the
    # boot guard enforces real Paystack keys.
    from app.routers.payments import _handle_charge_success

    event = {"event": "charge.success", "data": {"reference": reference}}
    async with db.pool.acquire() as conn:
        await _handle_charge_success(event, conn)
    return {"ok": True}
