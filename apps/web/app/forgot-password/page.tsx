"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const field = "w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-forest";
  const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-muted";

  return (
    <section className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center overflow-hidden bg-forest-deep px-4 py-16">
      <div className="contour-pattern absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-moss/25 blur-3xl" aria-hidden="true" />
      <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-trail/20 blur-3xl" aria-hidden="true" />
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-white">Reset your password</h1>
        {sent ? (
          <div className="card mt-8">
            <p className="text-sm text-foreground/70">
              If an account exists for <strong>{email}</strong>, we&apos;ve sent a
              password reset link. Check your inbox.
            </p>
            <Link href="/login" className="btn-ghost mt-6">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="card mt-8 space-y-4">
            {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
            <div>
              <label className={label}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={field}
                placeholder="you@example.com"
              />
            </div>
            <button type="submit" disabled={submitting} className="btn-forest w-full">
              {submitting ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
