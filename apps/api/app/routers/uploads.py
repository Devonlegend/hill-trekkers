import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.deps import get_current_user
from app.services.storage import build_local_upload, build_signed_upload, is_cloudinary_configured

router = APIRouter()

UPLOAD_DIR = Path(settings.local_upload_dir)

MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"}


@router.get("/api/uploads/sign")
async def sign_upload(
    file_name: str = "image",
    content_type: str = "image/jpeg",
    user=Depends(get_current_user),
):
    if is_cloudinary_configured():
        return build_signed_upload()
    return build_local_upload()


@router.post("/api/uploads/local")
async def local_upload(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    # Local-disk storage is dev-only: it is ephemeral on most PaaS hosts and
    # not shared across workers. Production must use Cloudinary (enforced at
    # boot via enforce_production_settings()).
    if settings.is_production:
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "Local uploads are disabled in production."})
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename or "image.jpg").suffix.lower() or ".jpg"
    if suffix not in ALLOWED_IMAGE_SUFFIXES:
        suffix = ".jpg"
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, detail={"code": "FILE_TOO_LARGE", "message": "Image must be under 5 MB."})
    name = f"{secrets.token_urlsafe(12)}{suffix}"
    (UPLOAD_DIR / name).write_bytes(data)
    return {"secure_url": f"/uploads/{name}"}


def mount_static_uploads(app):
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
