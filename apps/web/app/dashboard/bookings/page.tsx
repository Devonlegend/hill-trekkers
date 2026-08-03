"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Booking } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { formatDate, formatKobo } from "@/lib/format";

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);

  useEffect(() => {
    api<Booking[]>("/api/bookings/me")
      .then(setBookings)
      .catch(() => setBookings([]));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-forest">My Bookings</h1>
      <p className="mt-1 text-sm text-foreground/60">Your trips and their payment status.</p>

      <div className="mt-6 space-y-4">
        {bookings === null ? (
          <Skeleton className="h-40" />
        ) : bookings.length === 0 ? (
          <EmptyState title="No bookings yet" message="Browse trips and book your first adventure." />
        ) : (
          bookings.map((b) => (
            <div key={b.id} className="card flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="h-20 w-full rounded-xl bg-forest-deep bg-cover bg-center sm:h-20 sm:w-28" style={b.cover_image_url ? { backgroundImage: `url(${b.cover_image_url})` } : {}} />
              <div className="flex-1">
                <Link href={`/activities/activities/${b.trip_slug}`} className="font-bold text-forest hover:underline">
                  {b.trip_title}
                </Link>
                <p className="mt-1 text-xs text-foreground/60">
                  {formatDate(b.start_date)} · {b.location ?? "—"} · {b.tier_name}
                </p>
                <p className="mt-1 text-sm font-semibold text-trail-deep">
                  {formatKobo(b.price_locked_kobo)} · {b.seats} seat{b.seats > 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <StatusBadge status={b.status} />
                {b.payment_status && b.payment_status !== "success" && (
                  <StatusBadge status={b.payment_status} />
                )}
                {b.status === "pending" && b.paystack_reference && (
                  <Link
                    href={`/dashboard/bookings/${b.id}/confirm?reference=${b.paystack_reference}`}
                    className="text-xs font-semibold text-trail-deep hover:underline"
                  >
                    Complete payment →
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
