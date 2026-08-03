"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Category, Trip } from "@/lib/types";
import { PriceTag } from "@/components/PriceTag";
import { SeatsRemaining } from "@/components/SeatsRemaining";
import { EmptyState } from "@/components/EmptyState";
import { TripCardSkeleton } from "@/components/Skeleton";
import { formatDateShort } from "@/lib/format";

export default function CategoryPage() {
  const params = useParams<{ categorySlug: string }>();
  const slug = params.categorySlug;
  const [category, setCategory] = useState<Category | null>(null);
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setTrips(null);
    setError(false);
    api<Category>(`/api/categories/${slug}`)
      .then(setCategory)
      .catch(() => setError(true));
    api<Trip[]>(`/api/categories/${slug}/trips`)
      .then(setTrips)
      .catch(() => setTrips([]));
  }, [slug]);

  if (error && !category) {
    return (
      <div className="container-x py-20">
        <EmptyState title="Category not found" message="This activity type doesn't exist." />
      </div>
    );
  }

  return (
    <>
      <section className="bg-forest-deep py-16 text-white">
        <div className="container-x">
          <Link href="/activities" className="text-sm text-white/60 hover:underline">← All activities</Link>
          <h1 className="mt-3 text-3xl font-extrabold md:text-4xl">{category?.name ?? "Loading…"}</h1>
          {category?.description && <p className="mt-3 max-w-2xl text-white/75">{category.description}</p>}
        </div>
      </section>

      <section className="container-x py-12 md:py-16">
        {trips === null ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <TripCardSkeleton /><TripCardSkeleton /><TripCardSkeleton />
          </div>
        ) : trips.length === 0 ? (
          <EmptyState
            title="No trips scheduled in this category yet"
            message="Check back soon — we're always adding new adventures."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((t) => (
              <Link key={t.id} href={`/activities/${slug}/${t.slug}`} className="card group overflow-hidden !p-0 transition-transform hover:-translate-y-1">
                <div className="h-44 bg-forest-deep bg-cover bg-center" style={t.cover_image_url ? { backgroundImage: `url(${t.cover_image_url})` } : {}} />
                <div className="space-y-3 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-moss">
                    {formatDateShort(t.start_date)} · {t.difficulty}
                  </p>
                  <p className="font-bold text-forest group-hover:underline">{t.title}</p>
                  {t.location && <p className="text-sm text-foreground/60">📍 {t.location}</p>}
                  <div className="flex items-center justify-between">
                    <PriceTag kobo={t.active_tier?.price_kobo} className="font-bold text-trail-deep" />
                    {t.distance_km != null && <span className="text-xs text-foreground/60">{t.distance_km} km</span>}
                  </div>
                  <SeatsRemaining seatsBooked={t.seats_booked} capacity={t.capacity} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}