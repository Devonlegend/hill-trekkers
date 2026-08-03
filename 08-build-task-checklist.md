# Build Task Checklist

Work through phases in order. Each task has a rough acceptance check so progress is verifiable
without ambiguity. This checklist assumes the stack in `00-README.md`; substitute equivalents if
using a different framework.

## Phase 0 — Project Setup
- [ ] Scaffold repo per the folder structure in `00-README.md` — `apps/web` (Next.js, `npx create-next-app`)
      and `apps/api` (FastAPI: `fastapi`, `uvicorn[standard]`, `asyncpg`, `pydantic-settings`,
      `python-jose[cryptography]`, `passlib[bcrypt]`, `httpx`, `apscheduler` in `requirements.txt`)
- [ ] Set up Postgres locally/remote; run `01-database-schema.sql`, then `02-seed-data.sql`
- [ ] Copy `07-env-example.txt` → `.env` in both `apps/web` and `apps/api`, fill in dev values
      (test Paystack keys, local `DATABASE_URL`)
- [ ] Add the `next.config.js` rewrite from `00-README.md` so `/api/*` proxies to FastAPI
- [ ] Confirm: `uvicorn app.main:app --reload` boots, connects to DB via the `get_db` dependency,
      and `GET /docs` (FastAPI's auto-generated OpenAPI UI) loads; `SELECT * FROM trip_categories`
      returns 5 rows

## Phase 1 — Auth
- [ ] Implement `POST /api/auth/signup`, `login`, `logout`, `verify-email`, `forgot-password`,
      `reset-password`, `GET /api/auth/me` as FastAPI routers
- [ ] Implement `get_current_user`, `require_email_verified`, `require_role` dependencies (`app/deps.py`)
- [ ] Build `/signup` and `/login` pages
- [ ] Confirm: can sign up, receive/verify email (or simulate in dev), log in, and hit an
      auth-protected test route successfully; wrong password returns 401; check the request in
      `/docs` shows the correct `Depends` security requirement

## Phase 2 — Static & Public Pages
- [ ] Build `/` Homepage, `/about`, `/activities` hub
- [ ] Build `/activities/:categorySlug` category page wired to `GET /api/categories/:slug/trips`
- [ ] Build `/activities/:categorySlug/:tripSlug` Trip Detail page (without booking button working yet
      — just render tiers/pricing/gallery/itinerary)
- [ ] Confirm: all 5 categories render with the seeded "Mount Idanre Day Hike" appearing under Hikes

## Phase 3 — Booking & Paystack (the core of the brief)
- [ ] Implement `app/services/pricing.py` (`get_active_tier`) — verify against the seeded trip's 3
      tiers by testing at different simulated timestamps (pytest with a fixed `at_time` argument)
- [ ] Implement `app/services/paystack.py` wrapper (`initialize_transaction`, `verify_transaction`)
- [ ] Implement `POST /api/bookings` per `04-paystack-integration.md` §5, using `conn.transaction()`
      with `SELECT ... FOR UPDATE` on the trip row to prevent overbooking
- [ ] Implement `POST /api/payments/webhook` with raw-body HMAC-SHA512 signature verification (§6) —
      test with Paystack's test-mode webhook simulator or a signed curl/httpx request; confirm
      `await request.body()` still returns the raw bytes (no earlier dependency has consumed it)
- [ ] Implement `GET /api/payments/verify/{reference}` (§7)
- [ ] Implement the expired-hold release job (§8) and confirm `APScheduler` fires it on the interval
- [ ] Wire up the Trip Detail page's `PricingPanel` + `BookAndPayButton`
- [ ] Build `/dashboard/bookings` and `/dashboard/bookings/:id/confirm`
- [ ] Confirm end-to-end: book the seeded trip using a Paystack test card → webhook fires → booking
      flips to `confirmed` → seats_booked increments → confirmation page shows success

## Phase 4 — Community
- [ ] Implement signed upload endpoint (`GET /api/uploads/sign`) against chosen storage provider
- [ ] Implement `posts`, `comments`, `likes`, `reports` endpoints
- [ ] Build `/community` feed, `/community/:postId`, `PostComposerModal`
- [ ] Confirm: create a post with 2 images and a caption, like it from a second account, comment,
      and confirm it appears correctly in the feed; confirm `members_only` posts are hidden from a
      logged-out view

## Phase 5 — Plan Your Adventure
- [ ] Build the `AdventureFinderQuiz`, `TripCalendar` (via `GET /api/trips/calendar`), downloadable
      guide, and `GroupRequestForm` (email-only is fine for v1)
- [ ] Confirm: calendar renders trips across categories with correct color-coding; quiz routes to
      the right category page

## Phase 6 — Admin
- [ ] Build `/admin/trips` CRUD + publish/unpublish
- [ ] Build `/admin/trips/:id/pricing` tier editor with overlap validation matching the DB constraint
- [ ] Build `/admin/bookings` + refund action (calls Paystack refund API, sets `status='refunded'`)
- [ ] Build `/admin/community` moderation queue
- [ ] Build `/admin/users` + role management
- [ ] Confirm: a `trip_leader` account can edit only trips they created; an `admin` account can edit
      anything and see all moderation reports

## Phase 7 — Hardening & Launch Prep
- [ ] Add rate limiting on login, booking creation, and post creation
- [ ] Add input validation (server-side) on every POST/PATCH body, matching the shapes in
      `03-api-specification.md`
- [ ] Switch Paystack keys from test to live; register the live webhook URL in the Paystack dashboard
- [ ] Load-test the booking endpoint for the "two people booking the last seat simultaneously" case
- [ ] Confirm HTTPS is enforced everywhere in production
- [ ] Final content pass: real trip data, real photos, real About Us copy, real code-of-conduct text
