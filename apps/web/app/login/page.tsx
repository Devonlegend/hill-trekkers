"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/components/auth-context";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser } = useAuth();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const redirectParam = params.get("redirect");
  // Only allow same-origin relative paths (no scheme, no protocol-relative //).
  const redirect =
    redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
      ? redirectParam
      : "/dashboard";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      const data = await api<{ user: { id: string } }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: fd.get("email"), password: fd.get("password") }),
      });
      setUser(data.user as never);
      router.push(redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const field = "w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-forest";
  const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-muted";

  return (
    <div className="w-full max-w-md">
      <h1 className="text-3xl font-bold text-forest">Welcome back</h1>
      <p className="mt-1 text-muted">Sign in to your member account.</p>

      <form onSubmit={onSubmit} className="card mt-8 space-y-4">
        {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
        <div>
          <label className={label}>Email</label>
          <input name="email" type="email" required className={field} placeholder="you@example.com" />
        </div>
        <div>
          <label className={label}>Password</label>
          <input name="password" type="password" required className={field} />
        </div>
        <div className="text-right">
          <Link href="/forgot-password" className="text-xs font-semibold text-trail-deep hover:underline">
            Forgot password?
          </Link>
        </div>
        <button type="submit" disabled={submitting} className="btn-forest w-full">
          {submitting ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-center text-sm text-muted">
          New here?{" "}
          <Link href="/signup" className="font-semibold text-trail-deep hover:underline">Join the Club</Link>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <section className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center overflow-hidden bg-forest-deep px-4 py-16">
      <div className="contour-pattern absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-moss/25 blur-3xl" aria-hidden="true" />
      <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-trail/20 blur-3xl" aria-hidden="true" />
      <Suspense fallback={<div className="text-white/70">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </section>
  );
}
