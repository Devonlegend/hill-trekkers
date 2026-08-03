"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Category, Trip, Post } from "@/lib/types";
import { PriceTag } from "@/components/PriceTag";
import { SeatsRemaining } from "@/components/SeatsRemaining";
import { TripCardSkeleton } from "@/components/Skeleton";
import { useAuth } from "@/components/auth-context";
import { formatDateShort } from "@/lib/format";

export default function HomePage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    api<Trip[]>("/api/trips?upcoming=true&limit=4")
      .then(setTrips)
      .catch(() => setTrips([]));
    api<Category[]>("/api/categories")
      .then(setCategories)
      .catch(() => {});
    api<{ posts: Post[] }>("/api/posts?limit=3")
      .then((d) => setPosts(d.posts))
      .catch(() => {});
  }, []);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-forest-deep text-white">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{ backgroundImage: "url(/hero-mountains.svg)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-forest-deep/60 via-forest-deep/30 to-forest-deep" />
        <div className="container-x relative py-24 md:py-32">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-trail" />
            Lagos · Abuja · Beyond
          </p>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
            Walk up mountains.
            <br />
            Lift each other up.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/80">
            The Hill Trekkers Club is a community of hikers, campers, and
            adventurers — exploring Nigeria&apos;s trails together, one summit at
            a time.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/activities" className="btn-trail">
              Explore Activities
            </Link>
            {user ? (
              <Link href="/dashboard" className="btn border border-white/30 bg-white/10 text-white hover:bg-white/20">
                Go to Dashboard
              </Link>
            ) : (
              <Link href="/signup" className="btn border border-white/30 bg-white/10 text-white hover:bg-white/20">
                Join the Club
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Activities */}
      <section className="container-x py-16 md:py-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-forest md:text-3xl">Our Activities</h2>
            <p className="mt-1 text-foreground/60">Five ways to get out there.</p>
          </div>
          <Link href="/activities" className="text-sm font-semibold text-trail-deep hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/activities/${c.slug}`}
              className="card group flex flex-col justify-between gap-4 transition-transform hover:-translate-y-1"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-forest text-white">
                {c.sort_order}
              </span>
              <div>
                <p className="font-bold text-forest group-hover:underline">{c.name}</p>
                <p className="mt-1 text-sm text-foreground/60">{c.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Upcoming trips */}
      <section className="bg-sand/60 py-16 md:py-20">
        <div className="container-x">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-forest md:text-3xl">Upcoming Treks</h2>
              <p className="mt-1 text-foreground/60">Grab a seat before they&apos;re gone.</p>
            </div>
            <Link href="/activities" className="text-sm font-semibold text-trail-deep hover:underline">
              See the calendar →
            </Link>
          </div>
          {trips === null ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <TripCardSkeleton />
              <TripCardSkeleton />
              <TripCardSkeleton />
              <TripCardSkeleton />
            </div>
          ) : trips.length === 0 ? null : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {trips.map((t) => (
                <Link key={t.id} href={`/activities/${t.category_slug}/${t.slug}`} className="card group overflow-hidden p-0!">
                  <div className="h-40 bg-forest bg-cover bg-center" style={t.cover_image_url ? { backgroundImage: `url(${t.cover_image_url})` } : {}} />
                  <div className="space-y-3 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-moss">
                      {t.category_name} · {formatDateShort(t.start_date)}
                    </p>
                    <p className="font-bold text-forest group-hover:underline">{t.title}</p>
                    <div className="flex items-center justify-between">
                      <PriceTag kobo={t.active_tier?.price_kobo} className="font-bold text-trail-deep" />
                      <span className="text-xs text-foreground/60">{t.difficulty}</span>
                    </div>
                    <SeatsRemaining seatsBooked={t.seats_booked} capacity={t.capacity} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Community preview */}
      <section className="container-x py-16 md:py-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-forest md:text-3xl">From the Community</h2>
            <p className="mt-1 text-foreground/60">Stories from the trail.</p>
          </div>
          <Link href="/community" className="text-sm font-semibold text-trail-deep hover:underline">
            Open community →
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {posts.map((p) => (
            <Link key={p.id} href={`/community/${p.id}`} className="card group overflow-hidden p-0!">
              {p.media_urls.length > 0 && (
                <div className="h-44 bg-sand bg-cover bg-center" style={{ backgroundImage: `url(${p.media_urls[0]})` }} />
              )}
              <div className="space-y-2 p-5">
                <p className="text-xs font-medium text-moss">{p.author.full_name} · {new Date(p.created_at).toLocaleDateString()}</p>
                <p className="line-clamp-3 text-sm text-foreground/80 group-hover:underline">
                  {p.caption || "View post"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Membership CTA */}
      <section className="container-x pb-16 md:pb-20">
        <div className="overflow-hidden rounded-3xl bg-forest text-white">
          <div className="flex flex-col items-start gap-6 p-8 md:flex-row md:items-center md:justify-between md:p-12">
            <div>
              <h2 className="text-2xl font-bold md:text-3xl">
                {user ? "Welcome back, trekker." : "Ready to hit the trail?"}
              </h2>
              <p className="mt-2 max-w-lg text-white/75">
                {user
                  ? "Browse upcoming trips, see your bookings, and share your stories from the summit."
                  : "Join the club for early-bird pricing, members-only adventures, and a community that always has your back."}
              </p>
            </div>
            {user ? (
              <Link href="/dashboard" className="btn-trail whitespace-nowrap">Go to Dashboard</Link>
            ) : (
              <Link href="/signup" className="btn-trail whitespace-nowrap">Join the Club</Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
