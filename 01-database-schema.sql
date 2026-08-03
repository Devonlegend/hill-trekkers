-- =========================================================
-- The Hill Trekkers Club — Database Schema (PostgreSQL 14+)
-- =========================================================
-- Run this against a fresh database. Requires the pgcrypto
-- extension for gen_random_uuid().

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- USERS & AUTH
-- =========================================================

CREATE TABLE users (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name               VARCHAR(150) NOT NULL,
  email                   VARCHAR(255) UNIQUE NOT NULL,
  phone                   VARCHAR(30),
  password_hash           TEXT NOT NULL,
  role                    VARCHAR(20) NOT NULL DEFAULT 'member'
                          CHECK (role IN ('member', 'trip_leader', 'admin')),
  emergency_contact_name  VARCHAR(150),
  emergency_contact_phone VARCHAR(30),
  medical_notes           TEXT,
  avatar_url              TEXT,
  email_verified          BOOLEAN NOT NULL DEFAULT false,
  is_active               BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users(email);

CREATE TABLE email_verification_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- TRIP CATALOG
-- =========================================================

-- The 5 "Our Activities" subpages live here as rows, not hardcoded pages,
-- so an admin can rename/reorder them without a code change.
CREATE TABLE trip_categories (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(100) NOT NULL,   -- e.g. "Hikes", "Tea and Pep Meets"
  slug             VARCHAR(100) UNIQUE NOT NULL,
  description      TEXT,
  cover_image_url  TEXT,
  sort_order       INT NOT NULL DEFAULT 0
);

CREATE TABLE trips (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id      UUID NOT NULL REFERENCES trip_categories(id),
  title            VARCHAR(200) NOT NULL,
  slug             VARCHAR(220) UNIQUE NOT NULL,
  summary          VARCHAR(300),
  description      TEXT,
  itinerary        TEXT,
  location         VARCHAR(200),
  meeting_point    VARCHAR(255),
  difficulty       VARCHAR(20) CHECK (difficulty IN ('easy', 'moderate', 'hard')),
  distance_km      NUMERIC(6,2),
  start_date       DATE NOT NULL,
  end_date         DATE,
  capacity         INT NOT NULL CHECK (capacity > 0),
  seats_booked     INT NOT NULL DEFAULT 0 CHECK (seats_booked >= 0),
  status           VARCHAR(20) NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'published', 'closed', 'cancelled')),
  cover_image_url  TEXT,
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_seats_within_capacity CHECK (seats_booked <= capacity)
);

CREATE INDEX idx_trips_category ON trips(category_id);
CREATE INDEX idx_trips_start_date ON trips(start_date);
CREATE INDEX idx_trips_status ON trips(status);

CREATE TABLE trip_media (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  media_url   TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0
);

-- =========================================================
-- DYNAMIC / EARLY-BIRD PRICING
-- =========================================================

CREATE TABLE trip_pricing_tiers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  tier_name    VARCHAR(50) NOT NULL,        -- "Early Bird", "Regular", "Late"
  price_kobo   BIGINT NOT NULL CHECK (price_kobo > 0),
  valid_from   TIMESTAMPTZ NOT NULL,
  valid_until  TIMESTAMPTZ NOT NULL,
  seat_cap     INT,                         -- optional cap just for this tier; NULL = no extra cap
  sort_order   INT NOT NULL DEFAULT 0,
  CONSTRAINT chk_tier_dates CHECK (valid_until > valid_from)
);

CREATE INDEX idx_pricing_trip ON trip_pricing_tiers(trip_id);
-- Prevents two tiers on the same trip from overlapping in time
CREATE UNIQUE INDEX idx_pricing_no_overlap ON trip_pricing_tiers (trip_id, valid_from, valid_until);

-- =========================================================
-- BOOKINGS & PAYMENTS
-- =========================================================

CREATE TABLE bookings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id),
  trip_id            UUID NOT NULL REFERENCES trips(id),
  tier_id            UUID NOT NULL REFERENCES trip_pricing_tiers(id),
  price_locked_kobo  BIGINT NOT NULL,       -- copied from the tier at booking time; never recalculated
  seats              INT NOT NULL DEFAULT 1 CHECK (seats > 0),
  status             VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'confirmed', 'cancelled', 'refunded', 'expired')),
  hold_expires_at    TIMESTAMPTZ,           -- pending bookings auto-expire if unpaid by this time
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_trip ON bookings(trip_id);
CREATE INDEX idx_bookings_status ON bookings(status);

CREATE TABLE payments (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id                  UUID NOT NULL REFERENCES bookings(id),
  paystack_reference          VARCHAR(100) UNIQUE NOT NULL,
  amount_kobo                 BIGINT NOT NULL,
  currency                    VARCHAR(10) NOT NULL DEFAULT 'NGN',
  status                      VARCHAR(20) NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'success', 'failed', 'abandoned')),
  paystack_authorization_url  TEXT,
  paid_at                     TIMESTAMPTZ,
  raw_webhook_payload         JSONB,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_reference ON payments(paystack_reference);

-- =========================================================
-- COMMUNITY (stories & photos)
-- =========================================================

CREATE TABLE posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID NOT NULL REFERENCES users(id),
  trip_id     UUID REFERENCES trips(id),    -- optional tag to a specific trip
  caption     TEXT,
  visibility  VARCHAR(20) NOT NULL DEFAULT 'public'
              CHECK (visibility IN ('public', 'members_only')),
  status      VARCHAR(20) NOT NULL DEFAULT 'visible'
              CHECK (status IN ('visible', 'hidden', 'removed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_trip ON posts(trip_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);

CREATE TABLE post_media (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  media_url   TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0
);

CREATE TABLE comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES users(id),
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_post ON comments(post_id);

CREATE TABLE likes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE TABLE reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id   UUID REFERENCES comments(id) ON DELETE CASCADE,
  reported_by  UUID NOT NULL REFERENCES users(id),
  reason       TEXT,
  status       VARCHAR(20) NOT NULL DEFAULT 'open'
               CHECK (status IN ('open', 'reviewed', 'dismissed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_report_target CHECK (post_id IS NOT NULL OR comment_id IS NOT NULL)
);

-- =========================================================
-- UPDATED_AT TRIGGER HELPER (optional but recommended)
-- =========================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_trips_updated_at BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
