"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-context";

export default function DashboardHome() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="card">
        <p className="text-sm text-muted">Welcome back,</p>
        <h1 className="mt-1 text-2xl font-bold text-forest">{user.full_name}</h1>
        <p className="mt-2 text-sm text-muted">
          Role: <span className="font-semibold capitalize text-forest">{user.role}</span>
          {" · "}
          Email {user.email_verified ? "verified ✓" : "not verified"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/dashboard/bookings" className="card transition-transform hover:-translate-y-1">
          <p className="text-2xl">🎒</p>
          <p className="mt-3 font-bold text-forest">My Bookings</p>
          <p className="mt-1 text-sm text-muted">View your trips, payments, and receipts.</p>
        </Link>
        <Link href="/dashboard/profile" className="card transition-transform hover:-translate-y-1">
          <p className="text-2xl">🧭</p>
          <p className="mt-3 font-bold text-forest">Profile & safety</p>
          <p className="mt-1 text-sm text-muted">Update emergency contact and medical notes.</p>
        </Link>
        <Link href="/community" className="card transition-transform hover:-translate-y-1">
          <p className="text-2xl">📷</p>
          <p className="mt-3 font-bold text-forest">Community</p>
          <p className="mt-1 text-sm text-muted">Share stories from the trail.</p>
        </Link>
        <Link href="/activities" className="card transition-transform hover:-translate-y-1">
          <p className="text-2xl">⛰️</p>
          <p className="mt-3 font-bold text-forest">Browse trips</p>
          <p className="mt-1 text-sm text-muted">Find your next adventure.</p>
        </Link>
      </div>
    </div>
  );
}
