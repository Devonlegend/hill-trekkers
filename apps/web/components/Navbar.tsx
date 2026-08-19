"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./auth-context";
import { useState } from "react";
import { List, X, ArrowRight } from "@phosphor-icons/react";

const NAV = [
  { href: "/about", label: "About" },
  { href: "/activities", label: "Activities" },
  { href: "/community", label: "Community" },
  { href: "/plan-your-adventure", label: "Plan a trip" },
];

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-[var(--cream)]/90 backdrop-blur">
      <div className="container-x flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <img
            src="/hilltrekkers.jpg"
            alt="Hill Trekkers Club"
            className="h-9 w-9 shrink-0 rounded-xl object-cover"
          />
          <span className="text-[17px] font-bold tracking-tight text-forest">
            Hill Trekkers Club
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-forest/80 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-active={pathname.startsWith(item.href)}
              className={`link-underline transition-colors hover:text-forest ${
                pathname.startsWith(item.href) ? "font-semibold text-forest" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {loading ? null : user ? (
            <>
              <Link
                href="/dashboard"
                className="link-underline hidden text-sm font-medium text-forest/80 transition-colors hover:text-forest md:block"
              >
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
              <Link
                href="/login"
                className="link-underline hidden text-sm font-medium text-forest/80 transition-colors hover:text-forest md:block"
              >
                Sign in
              </Link>
              <Link href="/signup" className="btn-trail hidden px-5! py-2! md:inline-flex">
                Join the Club
              </Link>
            </>
          )}
          <button
            className="grid h-10 w-10 place-items-center rounded-xl border border-black/10 text-forest md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={18} weight="bold" /> : <List size={18} weight="bold" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-black/5 bg-[var(--cream)] md:hidden">
          <nav className="container-x flex flex-col gap-1 py-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-forest hover:bg-forest/5"
              >
                {item.label}
                <ArrowRight size={15} />
              </Link>
            ))}
            <div className="mt-2 flex gap-3 border-t border-black/10 pt-3">
              {user ? (
                <>
                  <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="btn-forest py-2!">
                    Dashboard
                  </Link>
                  <button
                    onClick={async () => {
                      await logout();
                      router.push("/");
                      router.refresh();
                    }}
                    className="btn-ghost py-2!"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMenuOpen(false)} className="btn-ghost py-2!">
                    Sign in
                  </Link>
                  <Link href="/signup" onClick={() => setMenuOpen(false)} className="btn-trail py-2!">
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
