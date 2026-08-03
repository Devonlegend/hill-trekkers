"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { api } from "@/lib/api";

function ConfirmInner() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const reference = search.get("reference") || "";
  const [status, setStatus] = useState<"checking" | "success" | "pending" | "failed" | "error">("checking");

  useEffect(() => {
    if (!reference) {
      setStatus("pending");
      return;
    }
    api<{ status: string }>(`/api/payments/verify/${reference}`)
      .then((d) => {
        if (d.status === "success") setStatus("success");
        else if (d.status === "failed") setStatus("failed");
        else setStatus("pending");
      })
      .catch(() => setStatus("pending"));
  }, [reference]);

  return (
    <div className="card mx-auto max-w-md text-center">
      {status === "checking" && <p className="text-foreground/60">Confirming your payment…</p>}
      {status === "success" && (
        <>
          <span className="text-5xl">🎉</span>
          <h1 className="mt-4 text-2xl font-bold text-forest">Booking confirmed!</h1>
          <p className="mt-2 text-sm text-foreground/70">
            You&apos;re on the list. Check your My Bookings page for details, and keep an eye on your email.
          </p>
          <Link href="/dashboard/bookings" className="btn-forest mt-6">View my bookings</Link>
        </>
      )}
      {status === "pending" && (
        <>
          <span className="text-5xl">⏳</span>
          <h1 className="mt-4 text-2xl font-bold text-forest">Payment pending</h1>
          <p className="mt-2 text-sm text-foreground/70">
            We&apos;re still waiting to confirm your payment. This usually resolves within a minute — hit refresh, or check My Bookings shortly.
          </p>
          <div className="mt-6 flex gap-3">
            <button onClick={() => window.location.reload()} className="btn-forest flex-1">Refresh</button>
            <Link href="/dashboard/bookings" className="btn-ghost flex-1">My bookings</Link>
          </div>
        </>
      )}
      {status === "failed" && (
        <>
          <span className="text-5xl">⚠️</span>
          <h1 className="mt-4 text-2xl font-bold text-forest">Payment not completed</h1>
          <p className="mt-2 text-sm text-foreground/70">Your payment didn&apos;t go through. You can book again or retry from My Bookings.</p>
          <Link href="/activities" className="btn-forest mt-6">Browse trips</Link>
        </>
      )}
    </div>
  );
}

export default function BookingConfirmPage() {
  return (
    <div className="py-10">
      <Suspense fallback={<p className="text-center text-foreground/60">Loading…</p>}>
        <ConfirmInner />
      </Suspense>
    </div>
  );
}