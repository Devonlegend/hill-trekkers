"use client";

import { Suspense, useState, FormEvent } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

function ResetPasswordInner() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const token = new URLSearchParams(window.location.search).get("token") || "";
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, new_password: fd.get("password") }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const field = "w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-forest";
  const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-foreground/60";

  return (
    <div className="w-full max-w-md">
      <h1 className="text-3xl font-bold text-forest">Choose a new password</h1>
      {done ? (
        <div className="card mt-8 space-y-4">
          <p className="text-sm text-foreground/70">Your password has been updated.</p>
          <Link href="/login" className="btn-forest">Sign in</Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="card mt-8 space-y-4">
          {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
          <div>
            <label className={label}>New password</label>
            <input name="password" type="password" required minLength={8} className={field} />
          </div>
          <button type="submit" disabled={submitting} className="btn-forest w-full">
            {submitting ? "Saving…" : "Update password"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="container-x flex min-h-[60vh] items-center justify-center py-16">
      <Suspense fallback={<p className="text-foreground/60">Loading…</p>}>
        <ResetPasswordInner />
      </Suspense>
    </div>
  );
}
