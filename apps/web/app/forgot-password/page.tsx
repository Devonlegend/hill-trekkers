"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    await api("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    setSubmitting(false);
    setSent(true);
  }

  const field = "w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-forest";
  const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-foreground/60";

  return (
    <div className="container-x flex min-h-[60vh] items-center justify-center py-16">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-forest">Reset your password</h1>
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
    </div>
  );
}
