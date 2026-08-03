from fastapi import Depends, HTTPException, Request
import asyncpg
from jose import JWTError
from app.config import settings
from app.db import get_db
from app.services.security import decode_token


async def get_current_user(
    request: Request, conn: asyncpg.Connection = Depends(get_db)
) -> asyncpg.Record:
    token = request.cookies.get("session")
    if not token:
        raise HTTPException(401, detail={"code": "UNAUTHENTICATED", "message": "You must be signed in."})
    try:
        payload = decode_token(token)
    except JWTError:
        raise HTTPException(401, detail={"code": "INVALID_TOKEN", "message": "Your session is invalid."})
    user = await conn.fetchrow("SELECT * FROM users WHERE id = $1", payload["sub"])
    if not user or not user["is_active"]:
        raise HTTPException(401, detail={"code": "USER_NOT_FOUND", "message": "Account not found."})
    return user


async def require_email_verified(user=Depends(get_current_user)):
    if not user["email_verified"]:
        raise HTTPException(
            403,
            detail={"code": "EMAIL_NOT_VERIFIED", "message": "Please verify your email to do this."},
        )
    return user


def require_role(allowed_roles: list[str]):
    async def checker(user=Depends(get_current_user)):
        if user["role"] not in allowed_roles:
            raise HTTPException(403, detail={"code": "FORBIDDEN", "message": "You do not have permission."})
        return user

    return checker
