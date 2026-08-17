"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

function VerifyEmailInner() {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setState("error");
      return;
    }
    api("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then(() => setState("ok"))
      .catch(() => setState("error"));
  }, []);

  return (
    <div className="card max-w-md text-center">
      {state === "loading" && <p className="text-muted">Verifying…</p>}
      {state === "ok" && (
        <>
          <span className="text-4xl">🎉</span>
          <h1 className="mt-4 text-2xl font-bold text-forest">Email verified!</h1>
          <p className="mt-2 text-sm text-foreground/70">Your email is confirmed. You can now book trips.</p>
          <Link href="/login" className="btn-forest mt-6">Go to sign in</Link>
        </>
      )}
      {state === "error" && (
        <>
          <span className="text-4xl">⚠️</span>
          <h1 className="mt-4 text-2xl font-bold text-forest">Link invalid or expired</h1>
          <p className="mt-2 text-sm text-foreground/70">Please sign in and request a new verification link.</p>
          <Link href="/login" className="btn-forest mt-6">Go to sign in</Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <section className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center overflow-hidden bg-forest-deep px-4 py-16">
      <div className="contour-pattern absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-moss/25 blur-3xl" aria-hidden="true" />
      <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-trail/20 blur-3xl" aria-hidden="true" />
      <Suspense fallback={<p className="text-white/70">Loading…</p>}>
        <VerifyEmailInner />
      </Suspense>
    </section>
  );
}