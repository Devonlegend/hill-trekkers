"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Category, Trip, Post } from "@/lib/types";
import { PriceTag } from "@/components/PriceTag";
import { SeatsRemaining } from "@/components/SeatsRemaining";
import { TripCardSkeleton } from "@/components/Skeleton";
import { Reveal } from "@/components/Reveal";
import { useAuth } from "@/components/auth-context";
import { formatDateShort } from "@/lib/format";
import { placeholderImage } from "@/lib/images";
import { MountainMark } from "@/components/MountainMark";
import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react";

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
        <div className="contour-pattern absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="container-x relative grid min-h-[100dvh] items-center gap-14 py-20 lg:grid-cols-12 lg:py-24">
          <div className="lg:col-span-7">
            <h1
              className="hero-fade text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl"
              style={{ "--d": "0ms" } as React.CSSProperties}
            >
              Walk up mountains. Lift each other up.
            </h1>
            <p
              className="hero-fade mt-6 max-w-xl text-lg leading-relaxed text-white/75"
              style={{ "--d": "90ms" } as React.CSSProperties}
            >
              A community of hikers, campers, and adventurers exploring
              Nigeria&apos;s trails together, one summit at a time.
            </p>
            <div
              className="hero-fade mt-9 flex flex-wrap gap-3"
              style={{ "--d": "180ms" } as React.CSSProperties}
            >
              <Link href="/activities" className="btn-trail">
                Explore Activities
                <ArrowRight size={15} weight="bold" />
              </Link>
              {user ? (
                <Link href="/dashboard" className="btn-ghost-light">
                  Go to Dashboard
                </Link>
              ) : (
                <Link href="/signup" className="btn-ghost-light">
                  Join the Club
                </Link>
              )}
            </div>
          </div>

          <div
            className="hero-fade lg:col-span-5"
            style={{ "--d": "260ms" } as React.CSSProperties}
          >
            <div className="relative">
              <div className="absolute -inset-3 rounded-3xl border border-white/10" />
              <div className="relative overflow-hidden rounded-3xl bg-moss/20">
                <img
                  src={placeholderImage("hill-trekkers-summit", 1000, 1200)}
                  alt="Trekkers standing on a summit ridge at sunset"
                  className="aspect-[5/6] w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Activities */}
      {categories.length > 0 && (
        <section className="container-x py-20 md:py-28">
          <Reveal>
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight text-forest md:text-4xl">
                Five ways to get out there
              </h2>
              <p className="mt-3 text-muted">
                Hikes, camping, and weekend escapes, planned and led by people
                who know the trails.
              </p>
            </div>
          </Reveal>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:auto-rows-[13rem] lg:grid-cols-4">
            {categories.map((c, i) => (
              <Reveal
                key={c.id}
                delay={i * 60}
                className={i === 0 ? "sm:col-span-2 lg:row-span-2" : ""}
              >
                <Link
                  href={`/activities/${c.slug}`}
                  className="group relative block h-full min-h-60 overflow-hidden rounded-2xl"
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.05]"
                    style={{
                      backgroundImage: `url(${c.cover_image_url || placeholderImage(c.slug, 1000, 800)})`,
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-forest-deep/95 via-forest-deep/25 to-forest-deep/5" />
                  <span className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition-colors group-hover:bg-trail">
                    <ArrowUpRight size={16} weight="bold" />
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <p className="text-xl font-bold text-white">{c.name}</p>
                    {i === 0 ? (
                      <>
                        <p className="mt-2 max-w-md text-sm leading-relaxed text-white/75">
                          {c.description}
                        </p>
                        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-white underline-offset-4 group-hover:underline">
                          Explore {c.name}
                          <ArrowRight size={14} weight="bold" />
                        </span>
                      </>
                    ) : (
                      <p className="mt-1 text-sm text-white/60">{c.description}</p>
                    )}
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming trips */}
      <section className="bg-sand/50 py-20 md:py-28">
        <div className="container-x">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-xl">
                <h2 className="text-3xl font-bold tracking-tight text-forest md:text-4xl">
                  Upcoming treks
                </h2>
                <p className="mt-3 text-muted">
                  Book early for the best price. Seats go fast.
                </p>
              </div>
              <Link href="/activities" className="btn-ghost">
                View all treks
                <ArrowRight size={15} weight="bold" />
              </Link>
            </div>
          </Reveal>
          {trips === null ? (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <TripCardSkeleton />
              <TripCardSkeleton />
              <TripCardSkeleton />
              <TripCardSkeleton />
            </div>
          ) : trips.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-black/15 px-6 py-16 text-center">
              <p className="font-semibold text-forest">No upcoming treks yet</p>
              <p className="mt-2 text-sm text-muted">
                New adventures are being planned. Check back soon.
              </p>
            </div>
          ) : (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {trips.map((t, i) => (
                <Reveal key={t.id} delay={i * 60}>
                  <Link
                    href={`/activities/${t.category_slug}/${t.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-card transition-transform duration-200 hover:-translate-y-1"
                  >
                    <div className="relative overflow-hidden">
                      <div
                        className="aspect-[4/3] bg-sand bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.04]"
                        style={{
                          backgroundImage: `url(${t.cover_image_url || placeholderImage(t.slug, 800, 600)})`,
                        }}
                      />
                      <span className="absolute left-3 top-3 rounded-full bg-forest-deep/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur">
                        {formatDateShort(t.start_date)}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-moss">
                        {t.category_name}
                      </p>
                      <h3 className="font-bold leading-snug text-forest group-hover:underline">
                        {t.title}
                      </h3>
                      <div className="mt-auto flex items-center justify-between">
                        <PriceTag
                          kobo={t.active_tier?.price_kobo}
                          className="font-bold text-trail-deep"
                        />
                        <span className="rounded-full bg-forest/5 px-2.5 py-1 text-xs font-medium capitalize text-forest">
                          {t.difficulty}
                        </span>
                      </div>
                      <SeatsRemaining seatsBooked={t.seats_booked} capacity={t.capacity} />
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Community preview */}
      {posts.length > 0 && (
        <section className="container-x py-20 md:py-28">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-xl">
                <h2 className="text-3xl font-bold tracking-tight text-forest md:text-4xl">
                  Stories from the trail
                </h2>
                <p className="mt-3 text-muted">
                  Photos and notes from the club&apos;s trips.
                </p>
              </div>
              <Link href="/community" className="btn-ghost">
                Open community
                <ArrowUpRight size={15} weight="bold" />
              </Link>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {posts[0] && (
              <Reveal className="lg:col-span-2">
                <Link
                  href={`/community/${posts[0].id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-card transition-transform duration-200 hover:-translate-y-1"
                >
                  <div className="relative overflow-hidden">
                    {posts[0].media_urls[0] ? (
                      <div
                        className="aspect-[16/9] bg-sand bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.03]"
                        style={{ backgroundImage: `url(${posts[0].media_urls[0]})` }}
                      />
                    ) : (
                      <div className="grid aspect-[16/9] place-items-center bg-forest-deep">
                        <MountainMark className="h-16 w-16" />
                      </div>
                    )}
                    {posts[0].category_name && (
                      <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-forest backdrop-blur">
                        {posts[0].category_name}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-6">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-forest text-xs font-bold text-white">
                        {posts[0].author.full_name.slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-forest">
                          {posts[0].author.full_name}
                        </p>
                        <p className="text-xs text-muted-faint">
                          {new Date(posts[0].created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <p className="line-clamp-3 leading-relaxed text-foreground/80">
                      {posts[0].caption || "View post"}
                    </p>
                  </div>
                </Link>
              </Reveal>
            )}

            {posts.slice(1, 3).length > 0 && (
              <div className="flex flex-col gap-5">
                {posts.slice(1, 3).map((p, i) => (
                  <Reveal key={p.id} delay={i * 80} className="flex-1">
                    <Link
                      href={`/community/${p.id}`}
                      className="group flex h-full items-center gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-card transition-transform duration-200 hover:-translate-y-1"
                    >
                      <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-sand">
                        {p.media_urls[0] ? (
                          <img
                            src={p.media_urls[0]}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="font-bold text-forest">
                            {p.author.full_name.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-forest">
                          {p.author.full_name}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-foreground/70">
                          {p.caption || "View post"}
                        </p>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Membership CTA */}
      <section className="container-x pb-20 md:pb-28">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-forest text-white">
            <div className="contour-pattern absolute inset-0 opacity-50" />
            <div className="relative grid gap-8 p-10 md:grid-cols-2 md:items-center md:p-14">
              <div>
                <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                  {user ? "Welcome back, trekker." : "Ready to hit the trail?"}
                </h2>
                <p className="mt-3 max-w-lg leading-relaxed text-white/70">
                  {user
                    ? "Browse upcoming trips, see your bookings, and share your stories from the summit."
                    : "Join the club for early-bird pricing, members-only adventures, and a community that always has your back."}
                </p>
              </div>
              <div className="md:justify-self-end">
                {user ? (
                  <Link href="/dashboard" className="btn-trail whitespace-nowrap">
                    Go to Dashboard
                  </Link>
                ) : (
                  <Link href="/signup" className="btn-trail whitespace-nowrap">
                    Join the Club
                  </Link>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
