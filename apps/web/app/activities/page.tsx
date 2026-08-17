"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Category } from "@/lib/types";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Reveal } from "@/components/Reveal";
import { placeholderImage } from "@/lib/images";
import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react";

export default function ActivitiesPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);

  useEffect(() => {
    api<Category[]>("/api/categories")
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const [feature, ...rest] = categories ?? [];

  return (
    <>
      <section className="bg-forest-deep py-16 text-white md:py-20">
        <div className="container-x">
          <p className="mb-3 text-sm font-semibold text-white/70">
            Our activities
          </p>
          <h1 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            Five ways to get out there
          </h1>
          <p className="mt-5 max-w-xl leading-relaxed text-white/70">
            From easy first steps to multi-day expeditions, there&apos;s a trek
            for every fitness level and every mood.
          </p>
        </div>
      </section>

      <section className="container-x py-16 md:py-24">
        {categories === null ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        ) : categories.length === 0 ? (
          <EmptyState title="No activities yet" message="Check back soon." />
        ) : (
          <>
            {feature && (
              <Reveal>
                <Link
                  href={`/activities/${feature.slug}`}
                  className="group grid overflow-hidden rounded-2xl border border-black/5 bg-white shadow-card md:grid-cols-2"
                >
                  <div className="relative min-h-64 overflow-hidden">
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.04]"
                      style={{
                        backgroundImage: `url(${feature.cover_image_url || placeholderImage(feature.slug, 1200, 900)})`,
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-forest-deep/30 to-transparent" />
                  </div>
                  <div className="flex flex-col justify-center gap-5 p-8 md:p-12">
                    <h2 className="text-3xl font-bold tracking-tight text-forest md:text-4xl">
                      {feature.name}
                    </h2>
                    <p className="max-w-md leading-relaxed text-foreground/70">
                      {feature.description}
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-trail-deep">
                      Explore {feature.name}
                      <ArrowRight size={15} weight="bold" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            )}

            {rest.length > 0 && (
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {rest.map((c, i) => (
                  <Reveal key={c.id} delay={i * 60}>
                    <Link
                      href={`/activities/${c.slug}`}
                      className="group relative block min-h-72 overflow-hidden rounded-3xl"
                    >
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.05]"
                        style={{
                          backgroundImage: `url(${c.cover_image_url || placeholderImage(c.slug, 900, 700)})`,
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-forest-deep/90 via-forest-deep/20 to-transparent" />
                      <span className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition-colors group-hover:bg-trail">
                        <ArrowUpRight size={16} weight="bold" />
                      </span>
                      <div className="absolute inset-x-0 bottom-0 p-7">
                        <h2 className="text-2xl font-bold text-white">{c.name}</h2>
                        <p className="mt-2 max-w-md text-sm leading-relaxed text-white/75">
                          {c.description}
                        </p>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
