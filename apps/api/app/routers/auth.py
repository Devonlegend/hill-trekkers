import json
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response
import asyncpg
from app.config import settings
from app.db import get_db
from app.deps import get_current_user
from app.schemas.auth import (
    SignupRequest,
    LoginRequest,
    VerifyEmailRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.services.security import (
    hash_password,
    verify_password,
    create_access_token,
    make_token,
)
from app.services.mailer import send_verification_email, send_password_reset_email
from app.services.ratelimit import rate_limit

router = APIRouter()


def _public_user(row: asyncpg.Record) -> dict:
    return {
        "id": str(row["id"]),
        "full_name": row["full_name"],
        "email": row["email"],
        "role": row["role"],
        "email_verified": row["email_verified"],
        "phone": row["phone"],
        "avatar_url": row.get("avatar_url"),
    }


@router.post("/api/auth/signup", status_code=201)
async def signup(
    body: SignupRequest,
    conn: asyncpg.Connection = Depends(get_db),
    _=Depends(rate_limit(5, 60)),
):
    email = body.email.lower()
    existing = await conn.fetchval("SELECT 1 FROM users WHERE email = $1", email)
    if existing:
        raise HTTPException(409, detail={"code": "EMAIL_TAKEN", "message": "An account with this email already exists."})

    user = await conn.fetchrow(
        """
        INSERT INTO users (full_name, email, phone, password_hash, emergency_contact_name, emergency_contact_phone)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        """,
        body.full_name.strip(),
        email,
        body.phone,
        hash_password(body.password),
        body.emergency_contact_name,
        body.emergency_contact_phone,
    )

    token = make_token("verify")
    await conn.execute(
        "INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, now() + interval '24 hours')",
        user["id"],
        token,
    )
    await send_verification_email(
        email, f"{settings.app_base_url}/verify-email?token={token}"
    )
    return {"user": _public_user(user)}


@router.post("/api/auth/login")
async def login(
    body: LoginRequest,
    conn: asyncpg.Connection = Depends(get_db),
    _=Depends(rate_limit(10, 60)),
):
    email = body.email.lower()
    user = await conn.fetchrow("SELECT * FROM users WHERE email = $1", email)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, detail={"code": "INVALID_CREDENTIALS", "message": "Incorrect email or password."})
    if not user["is_active"]:
        raise HTTPException(403, detail={"code": "ACCOUNT_DISABLED", "message": "This account has been disabled."})

    token = create_access_token(str(user["id"]), user["role"])
    response = Response(content=json.dumps({"user": _public_user(user)}), media_type="application/json")
    response.set_cookie(
        key="session",
        value=token,
        httponly=True,
        secure=settings.environment == "production",
        samesite="lax",
        max_age=settings.jwt_expires_minutes * 60,
    )
    return response


@router.post("/api/auth/logout")
async def logout():
    response = Response(status_code=200)
    response.delete_cookie("session")
    return response


@router.post("/api/auth/verify-email")
async def verify_email(body: VerifyEmailRequest, conn: asyncpg.Connection = Depends(get_db)):
    row = await conn.fetchrow(
        "SELECT * FROM email_verification_tokens WHERE token = $1", body.token
    )
    if not row or row["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(400, detail={"code": "INVALID_VERIFICATION_TOKEN", "message": "This verification link is invalid or expired."})
    await conn.execute("UPDATE users SET email_verified = true WHERE id = $1", row["user_id"])
    await conn.execute("DELETE FROM email_verification_tokens WHERE id = $1", row["id"])
    return {"ok": True}


@router.post("/api/auth/forgot-password")
async def forgot_password(
    body: ForgotPasswordRequest,
    conn: asyncpg.Connection = Depends(get_db),
    _=Depends(rate_limit(5, 60)),
):
    email = body.email.lower()
    user = await conn.fetchrow("SELECT * FROM users WHERE email = $1", email)
    if user:
        token = make_token("reset")
        await conn.execute(
            "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, now() + interval '1 hour')",
            user["id"],
            token,
        )
        await send_password_reset_email(
            email, f"{settings.app_base_url}/reset-password?token={token}"
        )
    return {"ok": True}


@router.post("/api/auth/reset-password")
async def reset_password(body: ResetPasswordRequest, conn: asyncpg.Connection = Depends(get_db)):
    row = await conn.fetchrow("SELECT * FROM password_reset_tokens WHERE token = $1", body.token)
    if (
        not row
        or row["used"]
        or row["expires_at"] < datetime.now(timezone.utc)
    ):
        raise HTTPException(400, detail={"code": "INVALID_RESET_TOKEN", "message": "This reset link is invalid or expired."})
    await conn.execute(
        "UPDATE users SET password_hash = $1 WHERE id = $2",
        hash_password(body.new_password),
        row["user_id"],
    )
    await conn.execute("UPDATE password_reset_tokens SET used = true WHERE id = $1", row["id"])
    return {"ok": True}


@router.get("/api/auth/me")
async def me(user=Depends(get_current_user)):
    return {"user": _public_user(user)}
