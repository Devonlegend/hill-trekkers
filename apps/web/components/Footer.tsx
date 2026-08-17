import Link from "next/link";
import { MountainMark } from "./MountainMark";

const EXPLORE = [
  { href: "/activities", label: "Activities" },
  { href: "/community", label: "Community" },
  { href: "/plan-your-adventure", label: "Plan a trip" },
  { href: "/about", label: "About" },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-forest-deep text-white/65">
      <div className="container-x grid gap-10 py-14 md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="flex items-center gap-2.5">
            <MountainMark />
            <span className="text-[17px] font-bold tracking-tight text-white">
              Hill Trekkers Club
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            Walking up mountains and lifting each other up. A community of hikers
            and adventurers across Nigeria.
          </p>
        </div>

        <div className="text-sm md:col-span-3">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
            Explore
          </p>
          <ul className="space-y-3">
            {EXPLORE.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition-colors hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="text-sm md:col-span-4">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
            Get involved
          </p>
          <ul className="space-y-3">
            <li>
              <Link href="/signup" className="transition-colors hover:text-white">
                Join the Club
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="transition-colors hover:text-white">
                Member dashboard
              </Link>
            </li>
            <li>
              <Link href="/login" className="transition-colors hover:text-white">
                Sign in
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-xs text-white/60">
        <div className="container-x flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p>© {new Date().getFullYear()} The Hill Trekkers Club</p>
          <nav className="flex items-center gap-5">
            <Link href="/privacy" className="transition-colors hover:text-white">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-white">Terms</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
