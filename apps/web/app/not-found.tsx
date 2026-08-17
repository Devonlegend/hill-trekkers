"use client";

import Link from "next/link";
import { MountainMark } from "@/components/MountainMark";
import { ArrowLeft, Compass } from "@phosphor-icons/react";

export default function NotFound() {
  return (
    <section className="relative overflow-hidden bg-forest-deep text-white">
      <div className="contour-pattern absolute inset-0 opacity-40" />
      <div className="container-x relative grid min-h-[70dvh] place-items-center py-24">
        <div className="text-center">
          <span className="mx-auto mb-6 block w-fit">
            <MountainMark className="h-14 w-14" />
          </span>
          <p className="text-sm font-semibold text-white/70">Trail not found</p>
          <h1 className="mt-3 text-6xl font-extrabold leading-none tracking-tight md:text-7xl">
            404
          </h1>
          <p className="mx-auto mt-5 max-w-md leading-relaxed text-white/70">
            The page you&apos;re looking for has washed off the map. Head back to
            the trailhead or browse what&apos;s on the calendar.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/" className="btn-trail">
              <ArrowLeft size={15} weight="bold" />
              Back home
            </Link>
            <Link href="/activities" className="btn-ghost-light">
              <Compass size={15} weight="bold" />
              Explore activities
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}