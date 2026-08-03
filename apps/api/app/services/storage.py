import hashlib
import hmac
import secrets
from datetime import datetime, timezone

from app.config import settings

FOLDER = "hill-trekkers"


def is_cloudinary_configured() -> bool:
    key = settings.cloudinary_api_key or ""
    secret = settings.cloudinary_api_secret or ""
    return bool(
        settings.cloudinary_cloud_name
        and key
        and secret
        and not key.startswith("xxx")
        and not secret.startswith("xxx")
    )


def _sign(params: dict) -> str:
    text = "&".join(f"{k}={v}" for k, v in sorted(params.items()))
    return hmac.new(
        settings.cloudinary_api_secret.encode("utf-8"),
        text.encode("utf-8"),
        hashlib.sha1,
    ).hexdigest()


def build_signed_upload() -> dict:
    """Signed direct-to-Cloudinary upload (client POSTs with api_key + signature)."""
    timestamp = int(datetime.now(timezone.utc).timestamp())
    public_id = secrets.token_urlsafe(12)
    params = {
        "timestamp": timestamp,
        "folder": FOLDER,
        "public_id": public_id,
    }
    signature = _sign(params)
    cloud = settings.cloudinary_cloud_name
    return {
        "url": f"https://api.cloudinary.com/v1_1/{cloud}/image/upload",
        "method": "POST",
        "fields": {
            "api_key": settings.cloudinary_api_key,
            **params,
            "signature": signature,
        },
        "public_url": f"https://res.cloudinary.com/{cloud}/image/upload/{FOLDER}/{public_id}",
        "public_id": f"{FOLDER}/{public_id}",
    }


def build_local_upload() -> dict:
    """Dev fallback: POST the file to the API server, which stores it on disk."""
    return {
        "url": "/api/uploads/local",
        "method": "POST",
        "fields": {},
        "public_url": "",
    }
