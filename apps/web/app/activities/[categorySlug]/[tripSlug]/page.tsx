"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { Trip, PricingTier } from "@/lib/types";
import { useAuth } from "@/components/auth-context";
import { PriceTag } from "@/components/PriceTag";
import { SeatsRemaining } from "@/components/SeatsRemaining";
import { EmptyState } from "@/components/EmptyState";
import { TripCardSkeleton } from "@/components/Skeleton";
import { Reveal } from "@/components/Reveal";
import { formatDate } from "@/lib/format";
import { placeholderImage } from "@/lib/images";
import {
  ArrowLeft,
  ArrowRight,
  CalendarBlank,
  MapPin,
  Clock,
  Compass,
} from "@phosphor-icons/react";

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
    return <button disabled className="btn-trail w-full opacity-60">Loading…</button>;
  }

  if (!user) {
    return (
      <div className="space-y-3">
        <Link href={`/login?redirect=${encodeURIComponent(tripUrl)}`} className="btn-forest w-full">
          Sign in to Book
        </Link>
        <p className="text-center text-xs text-muted-faint">
          New here?{" "}
          <Link href={`/signup?redirect=${encodeURIComponent(tripUrl)}`} className="font-semibold text-trail-deep">
            Join the Club
          </Link>
        </p>
      </div>
    );
  }

  if (!user.email_verified) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
        <p className="text-sm font-semibold text-amber-800">Verify your email to book</p>
        <p className="mt-1 text-xs text-amber-700/80">Check your inbox for the verification link.</p>
      </div>
    );
  }

  if (soldOut) {
    return <button disabled className="btn-trail w-full cursor-not-allowed opacity-50">Sold Out</button>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button onClick={handleBook} disabled={busy} className="btn-trail w-full">
        {busy
          ? "Starting checkout…"
          : `Book & Pay ${trip.active_tier ? `· ${trip.active_tier.tier_name}` : ""}`}
        <ArrowRight size={15} weight="bold" />
      </button>
    </div>
  );
}

function PricingPanel({ trip }: { trip: Trip }) {
  const tiers = useMemo(() => trip.pricing_tiers ?? [], [trip.pricing_tiers]);
  const active = trip.active_tier;
  const now = useNow();
  const nextTier = useMemo(() => {
    if (!active) return tiers.find((t) => new Date(t.valid_from).getTime() > now);
    return tiers.find((t) => new Date(t.valid_from).getTime() > new Date(active.valid_from).getTime());
  }, [tiers, active, now]);
  const countdown = useCountdown(nextTier?.valid_from);

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-card">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-faint">
            Current price
          </p>
          <div className="mt-2">
            <PriceTag kobo={active?.price_kobo} className="text-3xl font-extrabold tracking-tight text-forest" />
          </div>
        </div>
        {active && (
          <span className="rounded-full bg-forest/10 px-3 py-1 text-xs font-bold text-forest">
            {active.tier_name}
          </span>
        )}
      </div>

      {tiers.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-faint">
            Price goes up
          </p>
          <ul className="space-y-2.5">
            {tiers.map((t: PricingTier) => (
              <li key={t.id} className="flex items-center justify-between text-sm">
                <span className={t.id === active?.id ? "font-semibold text-forest" : "text-muted"}>
                  {t.tier_name}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-muted-faint">{formatDate(t.valid_from)}</span>
                  <PriceTag kobo={t.price_kobo} className="font-semibold" />
                </span>
              </li>
            ))}
          </ul>
          {countdown && nextTier && (
            <p className="mt-4 rounded-xl bg-trail/10 px-4 py-3 text-xs font-medium text-trail-deep">
              {nextTier.tier_name} pricing starts in {countdown.d}d {countdown.h}h {countdown.m}m
            </p>
          )}
        </div>
      )}

      <div className="mt-6 border-t border-black/5 pt-5">
        <SeatsRemaining seatsBooked={trip.seats_booked} capacity={trip.capacity} />
      </div>

      <div className="mt-5">
        <BookAndPayButton trip={trip} />
      </div>
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
      <section className="bg-forest-deep py-14 text-white">
        <div className="container-x">
          <Link
            href={`/activities/${params.categorySlug}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/55 transition-colors hover:text-white"
          >
            <ArrowLeft size={15} />
            {trip.category_name ?? "Activities"}
          </Link>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            {trip.title}
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/75">
            <span className="inline-flex items-center gap-2">
              <CalendarBlank size={16} />
              {formatDate(trip.start_date)}
            </span>
            <span className="inline-flex items-center gap-2 capitalize">
              <Compass size={16} />
              {trip.difficulty}
            </span>
            {trip.distance_km != null && (
              <span className="inline-flex items-center gap-2">
                <Clock size={16} />
                {trip.distance_km} km
              </span>
            )}
            {trip.location && (
              <span className="inline-flex items-center gap-2">
                <MapPin size={16} />
                {trip.location}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="container-x grid gap-10 py-12 lg:grid-cols-3 md:py-16">
        <div className="space-y-10 lg:col-span-2">
          {gallery.length > 0 && (
            <Reveal>
              <div className="grid gap-3">
                <div
                  className="aspect-[16/9] rounded-2xl bg-sand bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${gallery[0].media_url || placeholderImage(trip.slug, 1400, 800)})`,
                  }}
                />
                {gallery.length > 1 && (
                  <div className="grid grid-cols-4 gap-3">
                    {gallery.slice(1, 5).map((g, i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-xl bg-sand bg-cover bg-center"
                        style={{
                          backgroundImage: `url(${g.media_url || placeholderImage(`${trip.slug}-${i}`, 400, 400)})`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Reveal>
          )}

          {trip.summary && (
            <Reveal>
              <section className="border-t border-black/5 pt-8">
                <h2 className="text-xl font-bold tracking-tight text-forest">Overview</h2>
                <p className="mt-3 leading-relaxed text-foreground/80">{trip.summary}</p>
                {trip.description && (
                  <p className="mt-3 leading-relaxed text-foreground/80">{trip.description}</p>
                )}
              </section>
            </Reveal>
          )}

          {trip.itinerary && (
            <Reveal>
              <section className="border-t border-black/5 pt-8">
                <h2 className="text-xl font-bold tracking-tight text-forest">Itinerary</h2>
                <div className="mt-6 space-y-6">
                  {trip.itinerary.split("→").map((step, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-forest/15 bg-forest/5 text-xs font-bold text-forest">
                          {i + 1}
                        </span>
                        {i < trip.itinerary!.split("→").length - 1 && (
                          <span className="mt-1 w-px flex-1 bg-forest/15" />
                        )}
                      </div>
                      <p className="pt-1.5 text-sm leading-relaxed text-foreground/80">
                        {step.trim()}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </Reveal>
          )}

          <Reveal>
            <section className="border-t border-black/5 pt-8">
              <h2 className="text-xl font-bold tracking-tight text-forest">Trip details</h2>
              <dl className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
                {[
                  { dt: "Meeting point", dd: trip.meeting_point || "Not set" },
                  { dt: "Location", dd: trip.location || "Not set" },
                  { dt: "Difficulty", dd: trip.difficulty },
                  { dt: "Distance", dd: trip.distance_km != null ? `${trip.distance_km} km` : "Not set" },
                ].map((row) => (
                  <div key={row.dt}>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-faint">
                      {row.dt}
                    </dt>
                    <dd className="mt-1.5 capitalize">{row.dd}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </Reveal>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <PricingPanel trip={trip} />
          <p className="mt-4 rounded-xl bg-sand/70 p-4 text-xs leading-relaxed text-muted">
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
