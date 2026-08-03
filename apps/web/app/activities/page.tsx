"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Category } from "@/lib/types";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";

export default function ActivitiesPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);

  useEffect(() => {
    api<Category[]>("/api/categories")
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  return (
    <>
      <section className="bg-forest-deep py-16 text-white md:py-20">
        <div className="container-x">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/60">Our Activities</p>
          <h1 className="max-w-2xl text-3xl font-extrabold leading-tight md:text-5xl">
            Five ways to get out there
          </h1>
          <p className="mt-4 max-w-xl text-white/75">
            From easy first steps to multi-day expeditions, there&apos;s a trek for
            every fitness level and every mood.
          </p>
        </div>
      </section>

      <section className="container-x py-16 md:py-20">
        {categories === null ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-56" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <EmptyState title="No activities yet" message="Check back soon." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c, i) => (
              <Link
                key={c.id}
                href={`/activities/${c.slug}`}
                className={`card group flex flex-col justify-between overflow-hidden p-0! transition-transform hover:-translate-y-1 ${
                  i === 0 ? "sm:col-span-2" : ""
                }`}
              >
                <div className="relative flex-1 bg-forest-deep bg-cover bg-center p-8 text-white" style={c.cover_image_url ? { backgroundImage: `url(${c.cover_image_url})` } : {}}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="relative">
                    <span className="mb-16 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                      {String(c.sort_order).padStart(2, "0")}
                    </span>
                    <h2 className="text-2xl font-bold">{c.name}</h2>
                    <p className="mt-2 max-w-md text-sm text-white/85">{c.description}</p>
                    <span className="mt-6 inline-block text-sm font-semibold text-white underline-offset-4 group-hover:underline">
                      Explore {c.name} →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
