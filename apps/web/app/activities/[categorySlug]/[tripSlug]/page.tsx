"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { Trip, PricingTier } from "@/lib/types";
import { useAuth } from "@/components/auth-context";
import { PriceTag } from "@/components/PriceTag";
import { SeatsRemaining } from "@/components/SeatsRemaining";
import { EmptyState } from "@/components/EmptyState";
import { TripCardSkeleton } from "@/components/Skeleton";
import { formatDate } from "@/lib/format";

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function useCountdown(target?: string) {
  const now = useNow();
  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return null;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return { d, h, m };
}

function BookAndPayButton({ trip }: { trip: Trip }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const soldOut = (trip.seats_remaining ?? 0) <= 0;
  const tripUrl = `/activities/${trip.category_slug ?? "activities"}/${trip.slug}`;

  const handleBook = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const data = await api<{ payment: { authorization_url: string } }>("/api/bookings", {
        method: "POST",
        body: JSON.stringify({ trip_id: trip.id, seats: 1 }),
      });
      window.location.href = data.payment.authorization_url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      setBusy(false);
    }
  }, [trip.id]);

  if (loading) {
    return <button disabled className="btn-forest w-full opacity-60">Loading…</button>;
  }

  if (!user) {
    return (
      <>
        <Link href={`/login?redirect=${encodeURIComponent(tripUrl)}`} className="btn-forest w-full">
          Sign in to Book
        </Link>
        <p className="text-center text-xs text-foreground/50">
          New here?{" "}
          <Link href={`/signup?redirect=${encodeURIComponent(tripUrl)}`} className="font-semibold text-trail-deep">
            Join the Club
          </Link>
        </p>
      </>
    );
  }

  if (!user.email_verified) {
    return (
      <div className="rounded-xl bg-amber-50 p-4 text-center">
        <p className="text-sm font-semibold text-amber-800">Verify your email to book</p>
        <p className="mt-1 text-xs text-amber-700/80">Check your inbox for the verification link.</p>
      </div>
    );
  }

  if (soldOut) {
    return <button disabled className="btn-forest w-full cursor-not-allowed opacity-50">Sold Out</button>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button onClick={handleBook} disabled={busy} className="btn-trail w-full">
        {busy ? "Starting checkout…" : `Book & Pay ${trip.active_tier ? `· ${trip.active_tier.tier_name}` : ""}`}
      </button>
    </div>
  );
}

function PricingPanel({ trip }: { trip: Trip }) {
  const tiers = trip.pricing_tiers ?? [];
  const active = trip.active_tier;
  const now = useNow();
  const nextTier = useMemo(() => {
    if (!active) return tiers.find((t) => new Date(t.valid_from).getTime() > now);
    return tiers.find((t) => new Date(t.valid_from).getTime() > new Date(active.valid_from).getTime());
  }, [tiers, active, now]);
  const countdown = useCountdown(nextTier?.valid_from);

  return (
    <div className="card space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Current price</p>
        <div className="mt-1 flex items-end gap-3">
          <PriceTag kobo={active?.price_kobo} className="text-3xl font-extrabold text-forest" />
          {active && <span className="mb-1 rounded-full bg-forest/10 px-3 py-1 text-xs font-bold text-forest">{active.tier_name}</span>}
        </div>
      </div>

      {tiers.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">Price goes up</p>
          <ul className="space-y-1.5 text-sm">
            {tiers.map((t: PricingTier) => (
              <li key={t.id} className="flex items-center justify-between">
                <span className={t.id === active?.id ? "font-semibold text-forest" : "text-foreground/60"}>
                  {t.tier_name}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-foreground/60">{formatDate(t.valid_from)}</span>
                  <PriceTag kobo={t.price_kobo} className="font-semibold" />
                </span>
              </li>
            ))}
          </ul>
          {countdown && nextTier && (
            <p className="mt-3 rounded-lg bg-trail/10 px-3 py-2 text-xs font-medium text-trail-deep">
              {nextTier.tier_name} pricing starts in {countdown.d}d {countdown.h}h {countdown.m}m
            </p>
          )}
        </div>
      )}

      <SeatsRemaining seatsBooked={trip.seats_booked} capacity={trip.capacity} />
      <BookAndPayButton trip={trip} />
    </div>
  );
}

export default function TripDetailPage() {
  const params = useParams<{ categorySlug: string; tripSlug: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api<Trip>(`/api/trips/${params.tripSlug}`)
      .then(setTrip)
      .catch(() => setError(true));
  }, [params.tripSlug]);

  if (error && !trip) {
    return (
      <div className="container-x py-20">
        <EmptyState title="Trip not found" message="This trip doesn't exist or isn't open yet." />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="container-x py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2"><TripCardSkeleton /></div>
          <TripCardSkeleton />
        </div>
      </div>
    );
  }

  const gallery = [
    ...(trip.cover_image_url ? [{ media_url: trip.cover_image_url }] : []),
    ...(trip.media ?? []).map((m) => ({ media_url: m.media_url })),
  ];

  return (
    <>
      <section className="bg-forest-deep py-12 text-white">
        <div className="container-x">
          <Link href={`/activities/${params.categorySlug}`} className="text-sm text-white/60 hover:underline">
            ← {trip.category_name ?? "Activities"}
          </Link>
          <h1 className="mt-3 text-3xl font-extrabold md:text-4xl">{trip.title}</h1>
          <div className="mt-3 flex flex-wrap gap-2 text-sm text-white/80">
            <span className="rounded-full bg-white/15 px-3 py-1">{formatDate(trip.start_date)}</span>
            <span className="rounded-full bg-white/15 px-3 py-1 capitalize">{trip.difficulty}</span>
            {trip.distance_km != null && <span className="rounded-full bg-white/15 px-3 py-1">{trip.distance_km} km</span>}
            {trip.location && <span className="rounded-full bg-white/15 px-3 py-1">📍 {trip.location}</span>}
          </div>
        </div>
      </section>

      <section className="container-x grid gap-8 py-10 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {gallery.length > 0 && (
            <div className="grid gap-3">
              <div className="h-80 overflow-hidden rounded-2xl bg-sand bg-cover bg-center" style={gallery[0].media_url ? { backgroundImage: `url(${gallery[0].media_url})` } : {}} />
              {gallery.length > 1 && (
                <div className="grid grid-cols-4 gap-3">
                  {gallery.slice(1, 5).map((g, i) => (
                    <div key={i} className="h-24 rounded-xl bg-sand bg-cover bg-center" style={g.media_url ? { backgroundImage: `url(${g.media_url})` } : {}} />
                  ))}
                </div>
              )}
            </div>
          )}

          {trip.summary && (
            <div className="card">
              <h2 className="text-lg font-bold text-forest">Overview</h2>
              <p className="mt-2 leading-relaxed text-foreground/80">{trip.summary}</p>
              {trip.description && <p className="mt-2 leading-relaxed text-foreground/80">{trip.description}</p>}
            </div>
          )}

          {trip.itinerary && (
            <div className="card">
              <h2 className="text-lg font-bold text-forest">Itinerary</h2>
              <div className="mt-4 space-y-3">
                {trip.itinerary.split("→").map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-forest text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <p className="pt-1 text-sm text-foreground/80">{step.trim()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <h2 className="text-lg font-bold text-forest">Trip details</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div><dt className="text-xs font-semibold uppercase text-foreground/50">Meeting point</dt><dd className="mt-1">{trip.meeting_point || "—"}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-foreground/50">Location</dt><dd className="mt-1">{trip.location || "—"}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-foreground/50">Difficulty</dt><dd className="mt-1 capitalize">{trip.difficulty}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-foreground/50">Distance</dt><dd className="mt-1">{trip.distance_km != null ? `${trip.distance_km} km` : "—"}</dd></div>
            </dl>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <PricingPanel trip={trip} />
          <p className="mt-4 rounded-xl bg-sand/70 p-4 text-xs leading-relaxed text-foreground/60">
            Not sure this is for you?{" "}
            <Link href="/plan-your-adventure" className="font-semibold text-trail-deep hover:underline">
              Plan your adventure
            </Link>{" "}
            and we&apos;ll point you to the right trip.
          </p>
        </aside>
      </section>
    </>
  );
}
