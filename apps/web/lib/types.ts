export type Role = "member" | "trip_leader" | "admin";

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  email_verified: boolean;
  phone?: string | null;
  avatar_url?: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  cover_image_url?: string | null;
  sort_order: number;
}

export interface PricingTier {
  id: string;
  trip_id: string;
  tier_name: string;
  price_kobo: number;
  valid_from: string;
  valid_until: string;
  seat_cap?: number | null;
  sort_order: number;
}

export interface Trip {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  description?: string | null;
  itinerary?: string | null;
  location?: string | null;
  meeting_point?: string | null;
  difficulty: string;
  distance_km?: number | null;
  start_date: string;
  end_date?: string | null;
  seats_booked: number;
  capacity: number;
  cover_image_url?: string | null;
  category_id?: string;
  category_slug?: string;
  category_name?: string;
  status?: string;
  media?: { id: string; media_url: string; sort_order: number }[];
  pricing_tiers?: PricingTier[];
  active_tier?: PricingTier | null;
  seats_remaining?: number;
}

export interface Booking {
  id: string;
  trip_id: string;
  trip_title: string;
  trip_slug: string;
  start_date?: string | null;
  location?: string | null;
  tier_name: string;
  price_locked_kobo: number;
  seats: number;
  status: string;
  payment_status?: string | null;
  paystack_reference?: string | null;
  cover_image_url?: string | null;
}

export interface Post {
  id: string;
  author: { id: string; full_name: string; avatar_url?: string | null };
  trip_title?: string | null;
  trip_id?: string | null;
  category_name?: string | null;
  caption?: string | null;
  visibility: string;
  media_urls: string[];
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  created_at: string;
}

export interface ApiError {
  detail: { code?: string; message?: string } | string;
}
