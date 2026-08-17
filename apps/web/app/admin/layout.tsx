"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth-context";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?redirect=" + encodeURIComponent(pathname));
      return;
    }
    if (user.role === "member") {
      router.replace("/");
      return;
    }
    setChecked(true);
  }, [loading, user, router, pathname]);

  if (!checked) {
    return <div className="container-x py-20 text-center text-muted">Checking permissions…</div>;
  }

  const isAdmin = user?.role === "admin";
  const LINKS = [
    { href: "/admin", label: "Trips", show: true },
    { href: "/admin/bookings", label: "Bookings", show: true },
    { href: "/admin/community", label: "Community", show: isAdmin },
    { href: "/admin/users", label: "Users", show: isAdmin },
  ];

  return (
    <div className="bg-sand/40">
      <div className="container-x grid gap-8 py-10 md:grid-cols-[200px_1fr]">
        <nav className="space-y-1 md:sticky md:top-24 md:self-start">
          <p className="mb-3 px-4 text-xs font-semibold uppercase tracking-wide text-muted-faint">
            Admin
          </p>
          {LINKS.filter((l) => l.show).map((l) => {
            const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
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
          <Link href="/dashboard" className="mt-4 block px-4 text-sm text-muted-faint hover:underline">
            ← Back to dashboard
          </Link>
        </nav>
        <div>{children}</div>
      </div>
    </div>
  );
}
