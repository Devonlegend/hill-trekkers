# The Hill Trekkers Club — Production Deployment Guide

This document covers taking the app from the development setup in `00-README.md`
to a production deployment. The repo is a monorepo with two deployable services:

| Service | Stack | Suggested host |
| --- | --- | --- |
| `apps/web` | Next.js 16 (standalone output) | Vercel / Fly.io / Render / Docker |
| `apps/api` | FastAPI + Gunicorn + Uvicorn workers | Render / Railway / Fly.io / Docker |
| database | PostgreSQL 16 | Managed Postgres (Neon / Render / RDS) |

---

## 1. Required production secrets

The API **refuses to boot in production** (`ENVIRONMENT=production`) unless all of
the following are real, non-placeholder values. This guard lives in
`app/config.py::enforce_production_settings()` and is the single most important
security control — it prevents the app from silently running in Paystack
**mock mode**, which uses a publicly-known webhook signature secret and would
allow anyone to forge a `charge.success` webhook and confirm bookings without
paying.

| Variable | Requirement |
| --- | --- |
| `ENVIRONMENT` | `production` |
| `APP_BASE_URL` | Your public web URL (used for email links + Paystack callback) |
| `DATABASE_URL` | Managed Postgres, **not** the local dev default |
| `JWT_SECRET` | Strong random value, ≥ 32 chars (`python -c "import secrets;print(secrets.token_urlsafe(48))"`) |
| `PAYSTACK_SECRET_KEY` | Real `sk_live_…` key (or `sk_test_…` for staging) |
| `PAYSTACK_PUBLIC_KEY` | Matching `pk_live_…` / `pk_test_…` |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Required — local-disk uploads are dev-only |
| `EMAIL_PROVIDER_API_KEY` | Brevo API key (transactional email) |
| `EMAIL_FROM_ADDRESS` | Verified sender, e.g. `hello@hilltrekkersclub.com` |
| `CORS_ORIGINS` | The exact web origin(s), comma-separated |
| `LOG_LEVEL` | `INFO` (or `WARNING` to reduce volume) |
| `DB_POOL_MIN` / `DB_POOL_MAX` | Tune to your DB plan (e.g. `2` / `10`) |
| `GUNICORN_WORKERS` | Worker count (default `4`) |

### Web
| Variable | Requirement |
| --- | --- |
| `FASTAPI_BASE_URL` | The deployed API base URL (e.g. `https://api.hilltrekkersclub.com`) |

---

## 2. Local production-like stack (Docker)

```bash
# from repo root — boots Postgres + API + Web
docker compose up --build
```

- Web: http://localhost:3000
- API: http://localhost:8000  (docs at `/docs`)
- Postgres is auto-initialised from `01-database-schema.sql` + `02-seed-data.sql`.

This stack runs in **development** mode (mock Paystack, logged emails) so you can
exercise the full flow locally. For a true production image, set the production
environment variables above when running the `api` service.

---

## 3. Build the images manually

```bash
# API
docker build -f apps/api/Dockerfile -t hilltrekkers-api ./apps/api

# Web (standalone)
docker build -f apps/web/Dockerfile -t hilltrekkers-web ./apps/web
```

Run the API:
```bash
docker run -p 8000:8000 --env-file apps/api/.env.production hilltrekkers-api
```

---

## 4. Platform-specific

### Web → Vercel
- Framework preset: **Next.js**
- Root directory: `apps/web`
- `output: "standalone"` is set in `next.config.ts` (Vercel ignores it but it's harmless)
- Set `FASTAPI_BASE_URL` env var to the API URL.

### API → Render / Railway / Fly.io
- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 4 -b 0.0.0.0:$PORT`
- A `Procfile` is included (`web:`) for Render's native detection.
- Add all production env vars in the dashboard.
- Health check path: `/health` (liveness) and `/health/ready` (readiness — pings the DB).

### Database
- Provision a managed Postgres 16.
- Run `01-database-schema.sql` then `02-seed-data.sql` against it (or use the
  docker-compose auto-init for staging).

---

## 5. Paystack live setup (do this at launch)

1. In the Paystack dashboard, switch to **live mode** and copy `sk_live_…` / `pk_live_…`.
2. Set them as `PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY` env vars.
3. Register the **live webhook URL** (e.g. `https://api.hilltrekkersclub.com/api/payments/webhook`) in the Paystack dashboard → Settings → Webhooks.
4. The webhook verifies the `x-paystack-signature` HMAC-SHA512 against your secret key — never expose `PAYSTACK_SECRET_KEY` to the client.

---

## 6. Security checklist (Phase 7 of `08-build-task-checklist.md`)

- [x] Production boot guard for JWT / Paystack / Cloudinary / DB (fail fast)
- [x] Mock Paystack router never mounted in production
- [x] `/docs`, `/redoc`, `/openapi.json` disabled in production
- [x] Rate limiting on login / signup / forgot-password / booking / post-create
- [x] `session` cookie is `HttpOnly` + `Secure` (production) + `SameSite=Lax`
- [x] Server-side price locking + `SELECT … FOR UPDATE` on booking (prevents overbooking)
- [x] Webhook is the only source of truth for payment success (verify-then-credit)
- [x] Upload size + content-type validation (5 MB, image suffixes)
- [x] Structured logging replaces `print()`
- [x] Dependencies pinned in `requirements.txt`
- [x] Gunicorn multi-worker production server
- [x] Healthcheck endpoints for load balancers
- [ ] HTTPS enforced at the reverse proxy / platform (terminate TLS upstream)
- [ ] Switch Paystack keys test → live + register live webhook URL
- [ ] Load-test the "two users booking the last seat" case
- [ ] Final content pass: real trips, photos, About copy, code of conduct

---

## 7. Rate limiting note

`app/services/ratelimit.py` uses an in-memory sliding window — fine for a single
process. With multiple Gunicorn workers the limits become per-worker (so the
effective ceiling is `workers × limit`). For a true global limit, swap the
`_buckets` dict for a Redis backend; the `rate_limit()` dependency API stays the same.
