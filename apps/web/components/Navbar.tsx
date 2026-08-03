"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./auth-context";
import { useState } from "react";

const NAV = [
  { href: "/about", label: "About Us" },
  { href: "/activities", label: "Our Activities" },
  { href: "/community", label: "Community" },
  { href: "/plan-your-adventure", label: "Plan Your Adventure" },
];

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-cream/90 backdrop-blur">
      <div className="container-x flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-forest text-sm font-bold text-white">
            ▲
          </span>
          <span className="text-lg font-bold tracking-tight text-forest">
            Hill Trekkers Club
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-forest/80 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`transition-colors hover:text-forest ${
                pathname === item.href ? "text-forest font-semibold" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {loading ? null : user ? (
            <>
              <Link href="/dashboard" className="hidden text-sm font-medium text-forest hover:underline md:block">
                Dashboard
              </Link>
              <button
                onClick={async () => {
                  await logout();
                  router.push("/");
                  router.refresh();
                }}
                className="btn-ghost hidden px-4! py-2! md:inline-flex"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden text-sm font-medium text-forest hover:underline md:block">
                Sign in
              </Link>
              <Link href="/signup" className="btn-forest hidden px-5! py-2! md:inline-flex">
                Join the Club
              </Link>
            </>
          )}
          <button
            className="grid h-10 w-10 place-items-center rounded-lg border border-black/10 md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            ☰
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-black/5 bg-cream md:hidden">
          <nav className="container-x flex flex-col gap-1 py-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-forest hover:bg-forest/5"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-3 border-t border-black/10 pt-3">
              {user ? (
                <>
                  <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="btn-forest py-2!">
                    Dashboard
                  </Link>
                  <button onClick={() => { logout(); router.push("/"); }} className="btn-ghost py-2!">
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMenuOpen(false)} className="btn-ghost py-2!">
                    Sign in
                  </Link>
                  <Link href="/signup" onClick={() => setMenuOpen(false)} className="btn-forest py-2!">
                    Join the Club
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
