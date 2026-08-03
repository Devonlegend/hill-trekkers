# Pages & Components Spec

For each route: purpose, auth requirement, data needed (which API calls from `03-api-specification.md`),
key components, and states to handle (loading / empty / error).

---

## `/` — Homepage
**Auth:** public
**Data:** `GET /api/trips?upcoming=true&limit=4`, `GET /api/categories`, `GET /api/posts?limit=3`
**Components:** `HeroBanner`, `ActivityCategoryCard` ×5, `UpcomingTripCard` ×4, `CommunityPreviewCard` ×3,
`MembershipCTA` (shows "Join the Club" for guests, "Welcome back" panel for members), `NewsletterSignup`
**States:** show skeleton cards while trips/posts load; if no upcoming trips, hide that section rather
than showing an empty grid.

## `/about` — About Us
**Auth:** public
**Data:** static content (CMS or hardcoded); optionally `GET /api/posts?featured=true` for testimonials
**Components:** `ClubStorySection`, `TeamMemberCard` (repeatable), `CodeOfConductSection`, `TestimonialCarousel`

## `/activities` — Our Activities (hub)
**Auth:** public
**Data:** `GET /api/categories`
**Components:** `ActivityCategoryCard` ×5 (large, with cover image + description), linking to
`/activities/:slug`

## `/activities/:categorySlug` — Category Page
**Auth:** public
**Data:** `GET /api/categories/:slug`, `GET /api/categories/:slug/trips`
**Components:** `CategoryHeader`, `TripFilterBar` (by date/price/difficulty), `TripCard` grid (each
shows `active_tier.price_kobo` and a "seats left" badge), `Pagination`
**States:** empty state ("No trips scheduled in this category yet — check back soon") when the list is empty.

## `/activities/:categorySlug/:tripSlug` — Trip Detail Page
**Auth:** public to view; **[Auth + email_verified]** to book
**Data:** `GET /api/trips/:slug`
**Components:**
- `TripGallery` (cover + `media[]`)
- `TripInfoPanel` (distance, difficulty, meeting point, dates)
- `ItinerarySection`
- `PricingPanel` — **critical component**, shows:
  - current active tier name + price
  - a countdown to when the *next* tier starts (from `pricing_tiers[]`, computed client-side for
    display only — never used to submit a price)
  - seats remaining vs. capacity (progress bar)
  - `BookAndPayButton` → calls `POST /api/bookings`, then redirects to `authorization_url`
    - if guest: button reads "Sign in to Book" and routes to `/login?redirect=<trip-url>`
    - if signed in but unverified: shows "Verify your email to book" with a resend-verification link
    - if sold out: disabled, "Sold Out"
- `TripQASection` (comments scoped to the trip, or reuse the Community comment component)

## `/community` — Community Feed
**Auth:** public read (members_only posts hidden from guests); posting requires **[Auth]**
**Data:** `GET /api/posts` (paginated/infinite scroll), `GET /api/categories` (for the filter)
**Components:**
- `CommunityFilterBar` (by category / by trip)
- `PostCard` — author avatar+name, trip tag chip, image carousel, caption, like button + count,
  comment count, "View post" link
- `NewPostButton` (members only) → opens `PostComposerModal`
- `PostComposerModal` — image upload (multi, via `GET /api/uploads/sign` then direct-to-storage PUT),
  caption textarea, optional trip-tag select, visibility toggle (public/members-only), submit → `POST /api/posts`

## `/community/:postId` — Single Post
**Auth:** public (respecting visibility) / **[Auth]** to like/comment/report
**Data:** `GET /api/posts/:id`
**Components:** `PostDetailHeader`, `PostMediaCarousel`, `CommentList` + `CommentComposer` **[Auth]**,
`ReportButton` **[Auth]**

## `/plan-your-adventure` — Plan Your Adventure
**Auth:** public
**Data:** `GET /api/categories`, `GET /api/trips/calendar`
**Components:**
- `AdventureFinderQuiz` — 2–3 quick questions ("New to hiking?" / "Solo or group?" / "This
  weekend or planning ahead?") that route to the best-fit category page
- `TripCalendar` — month view, color-coded dots per category, click a date → trips that day
- `DownloadableGuideCard` (packing checklist PDF)
- `GroupRequestForm` — name, email, group size, preferred dates, message → emails admin (no DB table
  needed initially; can add a `group_requests` table later if volume grows)

## `/signup`, `/login`
**Auth:** public (redirect to `/dashboard` if already signed in)
**Data:** `POST /api/auth/signup`, `POST /api/auth/login`
**Components:** `SignupForm` (incl. emergency contact fields), `LoginForm`, `ForgotPasswordLink`
**States:** inline field validation errors; a clear "check your email to verify" success state after signup.

## `/dashboard` — Member area (auth-guarded layout)
**Auth:** **[Auth]** — redirect to `/login` if not signed in
**Sub-routes:**
- `/dashboard/profile` — edit profile, emergency contact, medical notes, avatar
- `/dashboard/bookings` — list via `GET /api/bookings/me`; each row shows trip, tier, amount,
  status badge (Pending/Confirmed/Cancelled/Refunded), receipt download link
- `/dashboard/bookings/:id/confirm` — post-payment landing page; calls
  `GET /api/payments/verify/:reference` on load and shows a success/pending/failed state
- `/dashboard/posts` — the member's own Community posts, with edit/delete

## `/admin` — Admin area (role-guarded layout, **[Leader+]**/**[Admin]** per sub-route)
**Sub-routes:**
- `/admin/trips` — table of all trips, create/edit, publish/unpublish
- `/admin/trips/:id/pricing` — tier editor: add/remove tiers, date-range pickers, live validation
  that tiers don't overlap (mirrors the DB constraint) and that the trip has ≥1 tier before publish
- `/admin/bookings` — searchable/filterable table, manual refund action **[Admin only]**
- `/admin/community` — moderation queue from `GET /api/admin/reports`, hide/remove actions
- `/admin/users` — member list, role management **[Admin only]**

---

## Shared Components

| Component | Used on |
|---|---|
| `Navbar` (with auth-aware right side: Sign In/Sign Up vs. avatar dropdown) | every page |
| `Footer` | every page |
| `PriceTag` (formats kobo → "₦15,000") | Trip cards, Trip Detail, Bookings list |
| `SeatsRemainingBadge` | Trip cards, Trip Detail |
| `StatusBadge` (booking/payment status colors) | Bookings dashboard, Admin bookings |
| `ImageUploader` (signed-upload wrapper) | Post composer, Trip/Admin media, Profile avatar |
| `EmptyState` | any list that can be empty |
| `ConfirmDialog` | destructive admin actions (remove post, cancel trip) |

## Global UX Rules

- Any price shown anywhere must go through the same `PriceTag`/kobo-formatting helper — never
  hand-format money separately per page.
- Any page reachable pre-login that leads to a paid action (Trip Detail's Book & Pay) must
  gracefully route through sign up/sign in and back to the same trip, not drop the user at a
  generic dashboard.
- Mobile-first breakpoints throughout; the `TripCalendar` and admin tables are the two components
  most likely to need a distinct compact mobile layout (e.g., calendar → agenda list view under 480px).
