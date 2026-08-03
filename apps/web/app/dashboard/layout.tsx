"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth-context";

const LINKS = [
  { href: "/dashboard", label: "Overview", exact: true },
  { href: "/dashboard/bookings", label: "My Bookings", exact: false },
  { href: "/dashboard/posts", label: "My Posts", exact: false },
  { href: "/dashboard/profile", label: "Profile", exact: false },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?redirect=" + encodeURIComponent(pathname));
    } else if (!loading) {
      setChecked(true);
    }
  }, [loading, user, router, pathname]);

  if (!checked) {
    return <div className="container-x py-20 text-center text-foreground/60">Checking your session…</div>;
  }

  return (
    <div className="container-x grid gap-8 py-10 md:grid-cols-[200px_1fr]">
      <nav className="space-y-1 md:sticky md:top-24 md:self-start">
        {LINKS.map((l) => {
          const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`block rounded-lg px-4 py-2.5 text-sm font-medium ${
                active ? "bg-forest text-white" : "text-forest/70 hover:bg-forest/5"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
        {user && (user.role === "admin" || user.role === "trip_leader") && (
          <Link
            href="/admin"
            className={`block rounded-lg px-4 py-2.5 text-sm font-medium ${
              pathname.startsWith("/admin") ? "bg-trail text-white" : "text-trail-deep hover:bg-trail/10"
            }`}
          >
            Admin
          </Link>
        )}
      </nav>
      <div>{children}</div>
    </div>
  );
}
