# API Specification — The Hill Trekkers Club

Base URL: `/api`
Auth: JWT in an httpOnly cookie (`session`). Endpoints marked **[Auth]** require a valid session;
**[Admin]** requires `role IN ('admin')`; **[Leader+]** requires `role IN ('trip_leader','admin')`.

All money fields in requests/responses are in **kobo** (integer). Convert to Naira only for display.

---

## Auth

### `POST /api/auth/signup`
Body:
```json
{
  "full_name": "Ada Obi",
  "email": "ada@example.com",
  "phone": "+2348012345678",
  "password": "min-8-chars",
  "emergency_contact_name": "Chinedu Obi",
  "emergency_contact_phone": "+2348099999999"
}
```
Response `201`:
```json
{ "user": { "id": "uuid", "full_name": "...", "email": "...", "role": "member", "email_verified": false } }
```
Side effect: creates an `email_verification_tokens` row and sends a verification email.
Errors: `409` if email already exists.

### `POST /api/auth/login`
Body: `{ "email": "...", "password": "..." }`
Response `200`: sets `session` cookie; body `{ "user": {...} }`.
Errors: `401` invalid credentials.

### `POST /api/auth/logout`  **[Auth]**
Clears session cookie. `200`.

### `POST /api/auth/verify-email`
Body: `{ "token": "..." }` → sets `users.email_verified = true`. `200` or `400` if expired/invalid.

### `POST /api/auth/forgot-password`
Body: `{ "email": "..." }` → always returns `200` (don't leak whether the email exists); emails a reset link if it does.

### `POST /api/auth/reset-password`
Body: `{ "token": "...", "new_password": "..." }` → `200` or `400` if expired/used.

### `GET /api/auth/me`  **[Auth]**
Returns the current user's profile.

---

## Profile

### `PATCH /api/users/me`  **[Auth]**
Body: any subset of `full_name, phone, emergency_contact_name, emergency_contact_phone, medical_notes, avatar_url`.

---

## Categories & Trips (public read)

### `GET /api/categories`
Returns all 5 categories in `sort_order`. Powers the "Our Activities" hub and main nav.

### `GET /api/categories/:slug`
Category detail + description (for the category page header).

### `GET /api/categories/:slug/trips?status=published&sort=start_date&order=asc`
List of trips in that category. Each trip includes: `id, title, slug, summary, cover_image_url,
start_date, difficulty, seats_booked, capacity, active_tier` (active_tier = the currently valid
pricing tier resolved server-side, see `04-paystack-integration.md`).

### `GET /api/trips/:slug`
Full trip detail: all fields + `media[]` + `pricing_tiers[]` (all tiers, so the frontend can show
"price increases to ₦X on [date]") + `active_tier` + `seats_remaining`.

### `GET /api/trips?upcoming=true&limit=4`
Cross-category "Upcoming Trips" list for the Homepage.

### `GET /api/trips/calendar?from=2026-08-01&to=2026-12-31`
All published trips in a date range, for the "Plan Your Adventure" calendar view. Includes
`category_slug` so the frontend can color-code by activity type.

---

## Bookings & Payments

### `POST /api/bookings`  **[Auth, email_verified required]**
Body: `{ "trip_id": "uuid", "seats": 1 }`
Server logic:
1. Resolve the trip's currently active pricing tier at this exact moment.
2. Confirm `seats_remaining >= seats` requested.
3. Create a `bookings` row: `status='pending'`, `price_locked_kobo` = tier price × seats,
   `hold_expires_at = now() + 20 minutes`.
4. Call Paystack Initialize Transaction (see `04-paystack-integration.md`) with the locked amount.
5. Create a `payments` row: `status='pending'`, store the returned `paystack_reference` and
   `authorization_url`.

Response `201`:
```json
{
  "booking": { "id": "uuid", "status": "pending", "price_locked_kobo": 1500000 },
  "payment": { "reference": "htc_...", "authorization_url": "https://checkout.paystack.com/..." }
}
```
Errors: `409` if trip is sold out or the tier is no longer valid; `403` if email not verified.

### `GET /api/bookings/me`  **[Auth]**
List of the current user's bookings with trip + payment status, for the "My Bookings" dashboard page.

### `GET /api/bookings/:id`  **[Auth, owner or Admin]**

### `POST /api/payments/webhook`  *(public endpoint — Paystack calls this, not the frontend)*
See `04-paystack-integration.md` for full signature-verification and processing logic.
Always returns `200` quickly; heavy work happens after verification.

### `GET /api/payments/verify/:reference`  **[Auth, owner or Admin]**
Manually re-checks a transaction's status against Paystack (used by the callback page and as a
fallback if a webhook was missed). Idempotent — safe to call repeatedly.

---

## Community

### `GET /api/posts?category=hikes&trip_id=&cursor=`  *(public; members_only posts hidden from guests)*
Paginated feed, newest first.

### `GET /api/posts/:id`

### `POST /api/posts`  **[Auth]**
Body: `{ "caption": "...", "trip_id": "uuid|null", "visibility": "public|members_only", "media_urls": ["..."] }`
(Images are uploaded to storage first via a separate signed-upload step, then their URLs are passed here.)

### `POST /api/posts/:id/like`  **[Auth]** — toggles like for the current user.

### `POST /api/posts/:id/comments`  **[Auth]** — body `{ "body": "..." }`

### `POST /api/posts/:id/report`  **[Auth]** — body `{ "reason": "..." }`
### `POST /api/comments/:id/report`  **[Auth]** — body `{ "reason": "..." }`

### `GET /api/uploads/sign`  **[Auth]**
Returns a pre-signed URL for direct-to-storage image upload (S3/Cloudinary), so images never pass
through the app server.

---

## Admin

### `POST /api/admin/categories` · `PATCH /api/admin/categories/:id`  **[Admin]**

### `POST /api/admin/trips` · `PATCH /api/admin/trips/:id`  **[Leader+, own trips only unless Admin]**

### `PUT /api/admin/trips/:id/pricing-tiers`  **[Leader+]**
Body: full replacement array of tiers `[{ tier_name, price_kobo, valid_from, valid_until }, ...]`.
Server validates tiers don't overlap in time (matches the DB's unique index) and that every trip
has at least one tier before it can be `published`.

### `GET /api/admin/bookings?status=&trip_id=`  **[Leader+]**
### `POST /api/admin/bookings/:id/refund`  **[Admin]** — triggers a Paystack refund and sets booking `status='refunded'`.

### `GET /api/admin/reports?status=open`  **[Admin]**
### `PATCH /api/admin/posts/:id`  **[Admin]** — body `{ "status": "hidden|removed|visible" }`
### `GET /api/admin/users` · `PATCH /api/admin/users/:id/role`  **[Admin]**

---

## Standard Error Shape

```json
{ "error": { "code": "TRIP_SOLD_OUT", "message": "This trip is fully booked." } }
```
Use HTTP status codes conventionally (400 validation, 401 unauthenticated, 403 forbidden,
404 not found, 409 conflict, 500 server error).
