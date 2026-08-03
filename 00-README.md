# The Hill Trekkers Club — AI Build Package

This folder is a complete, implementation-ready spec for building The Hill Trekkers Club website.
It is written so an AI coding agent (e.g. Claude Code) or a human developer can build the app
end-to-end without needing to ask clarifying questions about scope, data shape, or the payment flow.

## How to use this package

Read the files in this order:

1. **00-README.md** (this file) — architecture, stack, folder layout, build order
2. **01-database-schema.sql** — run this first to create the Postgres database
3. **02-seed-data.sql** — sample categories/admin user/trips so the app has data to render immediately
4. **03-api-specification.md** — the full REST contract the frontend and backend must agree on
5. **04-paystack-integration.md** — working reference code for the payment flow (the trickiest part)
6. **05-pages-and-components.md** — every route, its components, states, and required API calls
7. **06-auth-and-permissions.md** — auth flow, roles, and route-guard rules
8. **07-env-example.txt** — copy to `.env` and fill in real values
9. **08-build-task-checklist.md** — an ordered, checkable task list to build the whole thing in phases

An agent should be able to load files 1–7 into context, then work straight down the checklist in file 8.

## Tech Stack (assumed by this spec)

| Layer | Choice |
|---|---|
| Frontend | Next.js (React, App Router) + Tailwind CSS |
| Backend | FastAPI (Python 3.11+), served by Uvicorn/Gunicorn, as a separate service from the frontend |
| Database | PostgreSQL |
| DB access | `asyncpg` for raw async queries (matches the plain SQL in `01-database-schema.sql` 1:1), or SQLAlchemy 2.0 async if the team prefers an ORM layer on top — the schema itself is ORM-agnostic |
| Validation | Pydantic v2 models for every request/response body |
| Auth | JWT (via `python-jose` or `PyJWT`) stored in an httpOnly cookie; passwords hashed with `passlib[bcrypt]` |
| Payments | Paystack (Transactions API + Webhooks), called from FastAPI with `httpx.AsyncClient` |
| Background jobs | `APScheduler` running inside the FastAPI process for the seat-hold-release job at low scale; move to Celery/Arq + Redis if the club's booking volume grows |
| Media storage | S3-compatible bucket (or Cloudinary) for trip photos and Community post photos |
| Email | Any transactional email provider (Postmark, SendGrid, Resend) via their Python SDK/HTTP API |
| Hosting | Frontend on Vercel; FastAPI on Render/Railway/Fly.io; managed Postgres (Neon/Render/RDS) |

**Frontend ↔ backend connection:** because the frontend (Next.js) and backend (FastAPI) are separate
services on separate origins, the simplest way to keep the httpOnly auth cookie working without CORS
headaches is to have Next.js **proxy** API calls to FastAPI via `rewrites()` in `next.config.js`, so
the browser only ever talks to one origin:

```js
// next.config.js
module.exports = {
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${process.env.FASTAPI_BASE_URL}/api/:path*` }];
  },
};
```

If you instead call FastAPI directly from the browser on its own domain, configure FastAPI's
`CORSMiddleware` with the exact frontend origin (never `"*"`) and `allow_credentials=True`, and set
the auth cookie with `SameSite="none"; Secure` so it survives the cross-site request.

If the building agent prefers a different stack entirely (e.g. Django, Laravel, Rails), the
**database schema, API contract, and business logic in this package are framework-agnostic** — only
the code samples in `04-paystack-integration.md` are FastAPI/Python-specific and should be translated
to the chosen language.

## Repository Folder Structure (suggested)

```
hill-trekkers-club/
├── apps/
│   ├── web/                     # Next.js frontend
│   │   ├── next.config.js       # proxies /api/* to FASTAPI_BASE_URL, see above
│   │   ├── app/
│   │   │   ├── page.tsx                         → Homepage
│   │   │   ├── about/page.tsx                   → About Us
│   │   │   ├── activities/page.tsx               → Our Activities hub
│   │   │   ├── activities/[categorySlug]/page.tsx           → Category page (Hikes, etc.)
│   │   │   ├── activities/[categorySlug]/[tripSlug]/page.tsx → Trip Detail page
│   │   │   ├── community/page.tsx               → Community feed
│   │   │   ├── community/[postId]/page.tsx        → Single post
│   │   │   ├── plan-your-adventure/page.tsx       → Plan Your Adventure
│   │   │   ├── signup/page.tsx
│   │   │   ├── login/page.tsx
│   │   │   ├── dashboard/...                     → Member dashboard (auth-guarded)
│   │   │   └── admin/...                          → Admin dashboard (role-guarded)
│   │   └── components/
│   └── api/                     # FastAPI backend
│       ├── app/
│       │   ├── main.py           → creates the FastAPI() app, mounts routers, CORS config
│       │   ├── config.py         → Pydantic Settings, reads .env
│       │   ├── db.py             → asyncpg pool (or SQLAlchemy async engine) + get_db dependency
│       │   ├── deps.py           → get_current_user, require_email_verified, require_role
│       │   ├── schemas/          → Pydantic request/response models
│       │   │   ├── auth.py
│       │   │   ├── trip.py
│       │   │   ├── booking.py
│       │   │   └── post.py
│       │   ├── routers/
│       │   │   ├── auth.py
│       │   │   ├── trips.py
│       │   │   ├── bookings.py
│       │   │   ├── payments.py
│       │   │   ├── community.py
│       │   │   └── admin.py
│       │   ├── services/
│       │   │   ├── pricing.py    → tier-resolution logic
│       │   │   ├── paystack.py   → Paystack API client wrapper (httpx)
│       │   │   ├── security.py   → password hashing + JWT encode/decode
│       │   │   └── mailer.py
│       │   └── jobs/
│       │       └── release_expired_holds.py   → APScheduler job, see 08-build-task-checklist.md
│       ├── requirements.txt      (or pyproject.toml if using Poetry/uv)
│       └── alembic/              → optional, only if you outgrow running schema.sql by hand
├── database/
│   ├── 01-database-schema.sql
│   └── 02-seed-data.sql
└── .env
```

## Core Business Rules to Preserve (do not simplify these away)

1. **Price is always resolved and locked server-side.** The frontend may display a price, but the
   backend must independently compute the active pricing tier at the moment of booking and store it
   on the `bookings.price_locked_kobo` column. Never trust a price value sent from the client.
2. **Payment status is only ever set to `success` after either (a) a verified Paystack webhook with a
   valid signature, or (b) a manual call to the Verify Transaction endpoint returning `success`.** The
   browser redirect back from Paystack is a UX nicety, never a source of truth.
3. **Seats are only decremented on confirmed payment**, not at booking creation — pending/unpaid
   bookings hold a seat temporarily via `hold_expires_at` and are released by a scheduled job if unpaid.
4. **All money is stored as integer subunits (kobo)**, never as floats, to avoid rounding errors.
5. **Roles are `member`, `trip_leader`, `admin`** — trip leaders can manage only trips they created;
   admins can manage everything, including pricing tiers and Community moderation.
