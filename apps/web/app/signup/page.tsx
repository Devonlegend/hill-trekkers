"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { api, ApiError } from "@/lib/api";

function SignupInner() {
  const params = useSearchParams();
  const rawRedirect = params.get("redirect");
  const redirect =
    rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/dashboard";
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          full_name: fd.get("full_name"),
          email: fd.get("email"),
          phone: fd.get("phone") || null,
          password: fd.get("password"),
          emergency_contact_name: fd.get("emergency_contact_name") || null,
          emergency_contact_phone: fd.get("emergency_contact_phone") || null,
        }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <section className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center overflow-hidden bg-forest-deep px-4 py-16">
        <div className="contour-pattern absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-moss/25 blur-3xl" aria-hidden="true" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-trail/20 blur-3xl" aria-hidden="true" />
        <div className="card max-w-md text-center">
          <span className="text-4xl">📧</span>
          <h1 className="mt-4 text-2xl font-bold text-forest">Check your email</h1>
          <p className="mt-2 text-sm text-foreground/70">
            We sent you a verification link. Click it to verify your email, then
            sign in to book your first trip.
          </p>
          <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} className="btn-forest mt-6">Go to sign in</Link>
        </div>
      </section>
    );
  }

  const field = "w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-forest";
  const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-muted";

  return (
    <section className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center overflow-hidden bg-forest-deep px-4 py-16">
      <div className="contour-pattern absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-moss/25 blur-3xl" aria-hidden="true" />
      <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-trail/20 blur-3xl" aria-hidden="true" />
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold text-forest">Join the Club</h1>
        <p className="mt-1 text-muted">Create your member account to book trips and join the community.</p>

        <form onSubmit={onSubmit} className="card mt-8 space-y-4">
          {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
          <div>
            <label className={label}>Full name</label>
            <input name="full_name" required minLength={2} className={field} placeholder="Ada Obi" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Email</label>
              <input name="email" type="email" required className={field} placeholder="you@example.com" />
            </div>
            <div>
              <label className={label}>Phone</label>
              <input name="phone" className={field} placeholder="+234 800 000 0000" />
            </div>
          </div>
          <div>
            <label className={label}>Password</label>
            <input name="password" type="password" required minLength={8} className={field} placeholder="At least 8 characters" />
          </div>
          <div className="rounded-xl bg-sand/70 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-faint">
              Emergency contact (optional, but recommended)
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label}>Name</label>
                <input name="emergency_contact_name" className={field} />
              </div>
              <div>
                <label className={label}>Phone</label>
                <input name="emergency_contact_phone" className={field} />
              </div>
            </div>
          </div>
          <button type="submit" disabled={submitting} className="btn-forest w-full">
            {submitting ? "Creating account…" : "Create account"}
          </button>
          <p className="text-center text-sm text-muted">
            Already a member?{" "}
            <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} className="font-semibold text-trail-deep hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </section>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="container-x flex min-h-[60vh] items-center justify-center text-muted">Loading…</div>}>
      <SignupInner />
    </Suspense>
  );
}
