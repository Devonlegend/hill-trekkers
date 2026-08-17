"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Category, Trip } from "@/lib/types";
import { PriceTag } from "@/components/PriceTag";
import { SeatsRemaining } from "@/components/SeatsRemaining";
import { EmptyState } from "@/components/EmptyState";
import { TripCardSkeleton } from "@/components/Skeleton";
import { Reveal } from "@/components/Reveal";
import { formatDateShort } from "@/lib/format";
import { placeholderImage } from "@/lib/images";
import { ArrowLeft, MapPin } from "@phosphor-icons/react";

export default function CategoryPage() {
  const params = useParams<{ categorySlug: string }>();
  const slug = params.categorySlug;
  const [category, setCategory] = useState<Category | null>(null);
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [error, setError] = useState(false);
  const [difficulty, setDifficulty] = useState<string | null>(null);

  useEffect(() => {
    setTrips(null);
    setError(false);
    setDifficulty(null);
    api<Category>(`/api/categories/${slug}`)
      .then(setCategory)
      .catch(() => setError(true));
    api<Trip[]>(`/api/categories/${slug}/trips`)
      .then(setTrips)
      .catch(() => setTrips([]));
  }, [slug]);

  const difficulties = useMemo(() => {
    const set = new Set<string>();
    for (const t of trips ?? []) if (t.difficulty) set.add(t.difficulty);
    return Array.from(set);
  }, [trips]);

  const visible = useMemo(() => {
    if (!trips) return null;
    if (!difficulty) return trips;
    return trips.filter((t) => t.difficulty === difficulty);
  }, [trips, difficulty]);

  if (error && !category) {
    return (
      <div className="container-x py-20">
        <EmptyState title="Category not found" message="This activity type doesn't exist." />
      </div>
    );
  }

  return (
    <>
      <section className="bg-forest-deep py-14 text-white md:py-16">
        <div className="container-x">
          <Link
            href="/activities"
            className="inline-flex items-center gap-1.5 text-sm text-white/55 transition-colors hover:text-white"
          >
            <ArrowLeft size={15} />
            All activities
          </Link>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            {category?.name ?? "Loading…"}
          </h1>
          {category?.description && (
            <p className="mt-4 max-w-2xl leading-relaxed text-white/70">
              {category.description}
            </p>
          )}
        </div>
      </section>

      <section className="container-x py-12 md:py-16">
        {visible !== null && difficulties.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setDifficulty(null)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                difficulty === null
                  ? "bg-forest text-white"
                  : "border border-black/10 bg-white text-foreground/70 hover:border-forest/40"
              }`}
            >
              All
            </button>
            {difficulties.map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d === difficulty ? null : d)}
                className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  difficulty === d
                    ? "bg-forest text-white"
                    : "border border-black/10 bg-white text-foreground/70 hover:border-forest/40"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        )}

        <div className="mt-8">
          {visible === null ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <TripCardSkeleton />
              <TripCardSkeleton />
              <TripCardSkeleton />
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              title="No trips in this view"
              message={
                difficulty
                  ? `No ${difficulty} trips scheduled in this category yet.`
                  : "Check back soon. We're always adding new adventures."
              }
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((t, i) => (
                <Reveal key={t.id} delay={i * 50}>
                  <Link
                    href={`/activities/${slug}/${t.slug}`}
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
                      <h3 className="font-bold leading-snug text-forest group-hover:underline">
                        {t.title}
                      </h3>
                      {t.location && (
                        <p className="flex items-center gap-1.5 text-sm text-muted">
                          <MapPin size={14} />
                          {t.location}
                        </p>
                      )}
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
    </>
  );
}
