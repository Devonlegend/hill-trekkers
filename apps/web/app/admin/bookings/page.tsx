"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { useAuth } from "@/components/auth-context";
import { formatDate, formatKobo } from "@/lib/format";

interface AdminBooking {
  id: string;
  user_name: string;
  user_email: string;
  trip_title: string;
  tier_name: string;
  price_locked_kobo: number;
  seats: number;
  status: string;
  paystack_reference?: string | null;
  created_at: string | null;
}

export default function AdminBookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<AdminBooking[] | null>(null);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async (status = "") => {
    const q = status ? `?status=${status}` : "";
    try {
      setBookings(await api<AdminBooking[]>(`/api/admin/bookings${q}`));
    } catch {
      setBookings([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isAdmin = user?.role === "admin";

  async function refund(b: AdminBooking) {
    if (!confirm(`Refund ${formatKobo(b.price_locked_kobo)} for ${b.user_name}?`)) return;
    try {
      await api(`/api/admin/bookings/${b.id}/refund`, { method: "POST" });
      await load(filter);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Refund failed");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-forest">Bookings</h1>
      <p className="mt-1 text-sm text-foreground/60">All member bookings and payments.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {["", "pending", "confirmed", "refunded", "cancelled", "expired"].map((s) => (
          <button
            key={s}
            onClick={() => {
              setFilter(s);
              load(s);
            }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              filter === s ? "bg-forest text-white" : "bg-black/5 text-foreground/70"
            }`}
          >
            {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      {error && <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-6 space-y-3">
        {bookings === null ? (
          <Skeleton className="h-40" />
        ) : bookings.length === 0 ? (
          <EmptyState title="No bookings" message="No bookings match this filter." />
        ) : (
          bookings.map((b) => (
            <div key={b.id} className="card flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-forest">{b.trip_title}</p>
                <p className="mt-1 text-xs text-foreground/60">
                  {b.user_name} · {b.user_email} · {b.tier_name} · {formatDate(b.created_at)}
                </p>
                <p className="mt-1 text-sm font-semibold text-trail-deep">
                  {formatKobo(b.price_locked_kobo)} · {b.seats} seat{b.seats > 1 ? "s" : ""}
                  {b.paystack_reference ? ` · ref ${b.paystack_reference.slice(0, 12)}…` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={b.status} />
                {isAdmin && b.status === "confirmed" && (
                  <button onClick={() => refund(b)} className="rounded-full bg-red-100 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-200">
                    Refund
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}