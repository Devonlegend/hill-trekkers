-- =========================================================
-- The Hill Trekkers Club — Seed Data (development, working creds)
-- Run after 01-database-schema.sql.
-- Credentials:
--   admin@hilltrekkersclub.com / admin123  (role: admin, verified)
--   member@hilltrekkersclub.com / member123 (role: member, verified)
-- =========================================================

INSERT INTO users (id, full_name, email, phone, password_hash, role, email_verified)
VALUES
  (gen_random_uuid(), 'Club Admin',   'admin@hilltrekkersclub.com',   '+2348000000000', '$2b$12$6mAzO2KBTpqQ9BH3OFgWK.80Mow64wHeZwh9CRnejuhzlSz2ZSpbe', 'admin',       true),
  (gen_random_uuid(), 'Member One',   'member@hilltrekkersclub.com',  '+2348011111111', '$2b$12$htm1RWXndmq9ptxcw6bvQeNfVDzdxJROC3JzK.bE4GRpKN6YlIIhe', 'member',      true);

-- The five required activity categories, in nav order
INSERT INTO trip_categories (name, slug, description, sort_order) VALUES
  ('Hikes',                'hikes',                'Regular local and day hikes for all fitness levels.', 1),
  ('Out Of State Trips',   'out-of-state-trips',   'Multi-day trips that take us beyond the city.', 2),
  ('Out In The Wild',      'out-in-the-wild',      'Camping and wilderness expeditions off the grid.', 3),
  ('Hikers Day Out',       'hikers-day-out',       'Casual, social, low-difficulty outings — a great first trip.', 4),
  ('Tea and Pep Meets',    'tea-and-pep-meets',    'Non-hiking social and motivational meetups for the club.', 5);

-- Example trip in "Hikes" with three pricing tiers
WITH cat AS (SELECT id FROM trip_categories WHERE slug = 'hikes'),
     admin_user AS (SELECT id FROM users WHERE email = 'admin@hilltrekkersclub.com'),
     new_trip AS (
       INSERT INTO trips (
         category_id, title, slug, summary, description, itinerary,
         location, meeting_point, difficulty, distance_km,
         start_date, capacity, status, created_by
       )
       SELECT
         cat.id,
         'Mount Idanre Day Hike',
         'mount-idanre-day-hike',
         'A scenic day hike up Idanre Hills with views over Ondo State.',
         'Join us for a full-day hike up the historic Idanre Hills, including the famous 660+ steps to the old palace site.',
         '06:00 departure from meeting point → 09:00 arrival & briefing → 09:30 ascent begins → 13:00 summit & lunch → 16:00 descent complete → 19:00 return.',
         'Idanre, Ondo State',
         'Club House Car Park',
         'moderate',
         12.5,
         CURRENT_DATE + INTERVAL '45 days',
         40,
         'published',
         admin_user.id
       FROM cat, admin_user
       RETURNING id
     )
INSERT INTO trip_pricing_tiers (trip_id, tier_name, price_kobo, valid_from, valid_until, sort_order)
SELECT id, 'Early Bird', 1500000, now(), now() + INTERVAL '15 days', 1 FROM new_trip
UNION ALL
SELECT id, 'Regular',    2000000, now() + INTERVAL '15 days', now() + INTERVAL '37 days', 2 FROM new_trip
UNION ALL
SELECT id, 'Late',       2500000, now() + INTERVAL '37 days', now() + INTERVAL '45 days', 3 FROM new_trip;

-- price_kobo values above are in kobo: 1,500,000 kobo = N15,000, etc.