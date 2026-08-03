import httpx
from app.config import settings

PAYSTACK_BASE = "https://api.paystack.co"

# In-memory store used only in mock/dev mode (no real Paystack keys configured).
_mock_store: dict[str, dict] = {}


def is_mock_mode() -> bool:
    key = settings.paystack_secret_key or ""
    return key == "" or key.startswith("sk_test_placeholder")


def _auth_headers() -> dict:
    return {"Authorization": f"Bearer {settings.paystack_secret_key}"}


async def initialize_transaction(
    email: str,
    amount_kobo: int,
    reference: str,
    callback_url: str,
    metadata: dict,
) -> dict:
    if is_mock_mode():
        _mock_store[reference] = {"amount": amount_kobo, "status": "pending"}
        return {
            "authorization_url": f"{settings.app_base_url}/api/mock/checkout?reference={reference}&callback={callback_url}",
            "reference": reference,
            "access_code": "",
        }
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{PAYSTACK_BASE}/transaction/initialize",
            headers=_auth_headers(),
            json={
                "email": email,
                "amount": amount_kobo,
                "reference": reference,
                "callback_url": callback_url,
                "metadata": metadata,
            },
            timeout=30,
        )
    data = res.json()
    if not data.get("status"):
        raise RuntimeError(data.get("message", "Paystack initialize failed"))
    return data["data"]


async def verify_transaction(reference: str) -> dict:
    if is_mock_mode():
        record = _mock_store.get(reference)
        if not record:
            return {"status": "failed", "amount": 0}
        return {"status": record["status"], "amount": record["amount"]}
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{PAYSTACK_BASE}/transaction/verify/{reference}",
            headers=_auth_headers(),
            timeout=30,
        )
    data = res.json()
    if not data.get("status"):
        raise RuntimeError(data.get("message", "Paystack verify failed"))
    return data["data"]


def mock_mark_success(reference: str) -> None:
    record = _mock_store.get(reference)
    if record:
        record["status"] = "success"


async def refund_transaction(reference: str, amount_kobo: int | None = None) -> dict:
    if is_mock_mode():
        return {"status": True, "data": {"reference": reference}}
    body = {"transaction": reference}
    if amount_kobo:
        body["amount"] = amount_kobo
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{PAYSTACK_BASE}/refund",
            headers=_auth_headers(),
            json=body,
            timeout=30,
        )
    data = res.json()
    if not data.get("status"):
        raise RuntimeError(data.get("message", "Paystack refund failed"))
    return data["data"]