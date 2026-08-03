# Auth & Permissions

## Auth mechanism

- Passwords hashed with **`passlib[bcrypt]`** (cost factor 12), never stored or logged in plaintext.
- On successful login, issue a **JWT** (payload: `{ sub: user.id, role: user.role }`, short expiry,
  e.g. 7 days) via `python-jose` or `PyJWT`, and set it as an **httpOnly, Secure, SameSite=Lax**
  cookie named `session` using `Response.set_cookie(...)`. Do not store the token in localStorage —
  that's readable by any injected script (XSS risk).
- In FastAPI, auth checks are **dependencies** (`Depends(...)`), not middleware, so they can be
  composed per-route and show up correctly in the auto-generated OpenAPI docs:

```python
# app/deps.py
from fastapi import Depends, HTTPException, Request
from jose import jwt, JWTError
import asyncpg
from app.config import settings
from app.db import get_db

async def get_current_user(request: Request, conn: asyncpg.Connection = Depends(get_db)):
    token = request.cookies.get("session")
    if not token:
        raise HTTPException(401, detail={"code": "UNAUTHENTICATED"})
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(401, detail={"code": "INVALID_TOKEN"})
    user = await conn.fetchrow("SELECT * FROM users WHERE id = $1", payload["sub"])
    if not user or not user["is_active"]:
        raise HTTPException(401, detail={"code": "USER_NOT_FOUND"})
    return user

async def require_email_verified(user=Depends(get_current_user)):
    if not user["email_verified"]:
        raise HTTPException(403, detail={"code": "EMAIL_NOT_VERIFIED"})
    return user

def require_role(allowed_roles: list[str]):
    async def checker(user=Depends(get_current_user)):
        if user["role"] not in allowed_roles:
            raise HTTPException(403, detail={"code": "FORBIDDEN"})
        return user
    return checker
```

Usage on a route: `Depends(get_current_user)` for any signed-in-only endpoint,
`Depends(require_email_verified)` on `POST /api/bookings` specifically, and
`Depends(require_role(["trip_leader", "admin"]))` on trip/pricing admin routes.

## Signup flow

1. `POST /api/auth/signup` → create user (`email_verified=false`), create an
   `email_verification_tokens` row (random token, 24h expiry), send verification email with a link
   like `https://hilltrekkersclub.com/verify-email?token=...`.
2. User clicks link → frontend calls `POST /api/auth/verify-email` → sets `email_verified = true`,
   deletes/invalidates the token.
3. User can browse and even create a booking record before verifying, but `POST /api/bookings` is
   blocked by `requireEmailVerified` until step 2 completes — surface a clear inline prompt with a
   "resend verification email" action rather than a dead end.

## Password reset flow

1. `POST /api/auth/forgot-password` → always respond `200` regardless of whether the email exists
   (prevents user enumeration); if it does exist, create a `password_reset_tokens` row (1h expiry)
   and email a reset link.
2. `POST /api/auth/reset-password` with `{ token, new_password }` → validate token not expired/used,
   update `password_hash`, mark token `used = true`.

## Roles

| Role | Can do |
|---|---|
| `member` | Book & pay for trips, post/comment/like in Community, manage own profile & bookings |
| `trip_leader` | Everything a member can, plus create/edit trips and pricing tiers **they created** |
| `admin` | Everything, including editing/deleting any trip, managing categories, moderating all
Community content, managing users/roles, issuing refunds |

Ownership check for `trip_leader`: on `PATCH /api/admin/trips/:id` and the pricing-tiers endpoint,
verify `trip["created_by"] == user["id"]` unless `user["role"] == "admin"` — raise `403` otherwise.

## Route guards (frontend)

- `/dashboard/*` → redirect to `/login?redirect=<path>` if no session.
- `/admin/*` → redirect to `/` (or show a 403 page) if `role === 'member'`.
- Trip Detail's `BookAndPayButton` → if no session, route to `/login?redirect=<trip-url>` so the
  member lands back on the exact trip after signing in, rather than losing their place.

## Rate limiting (recommended)

- `POST /api/auth/login` — limit by IP + email to slow brute-force attempts.
- `POST /api/bookings` — limit per user to prevent accidental/duplicate double-booking clicks.
- `POST /api/posts` — limit per user per hour to prevent Community spam.
