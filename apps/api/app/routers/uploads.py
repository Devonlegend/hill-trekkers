import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.deps import get_current_user
from app.services.storage import build_local_upload, build_signed_upload, is_cloudinary_configured

router = APIRouter()

UPLOAD_DIR = Path(settings.local_upload_dir)


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
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename or "image.jpg").suffix.lower() or ".jpg"
    if suffix not in {".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"}:
        suffix = ".jpg"
    name = f"{secrets.token_urlsafe(12)}{suffix}"
    (UPLOAD_DIR / name).write_bytes(await file.read())
    return {"secure_url": f"/uploads/{name}"}


def mount_static_uploads(app):
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
