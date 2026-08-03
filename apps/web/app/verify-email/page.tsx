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
      {state === "loading" && <p className="text-foreground/60">Verifying…</p>}
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
    <div className="container-x flex min-h-[50vh] items-center justify-center py-16">
      <Suspense fallback={<p className="text-foreground/60">Loading…</p>}>
        <VerifyEmailInner />
      </Suspense>
    </div>
  );
}