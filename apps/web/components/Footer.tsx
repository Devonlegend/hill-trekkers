import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-black/5 bg-forest-deep text-white/70">
      <div className="container-x grid gap-8 py-12 md:grid-cols-3">
        <div>
          <p className="text-lg font-bold text-white">Hill Trekkers Club</p>
          <p className="mt-2 max-w-xs text-sm">
            Walking up mountains and lifting each other up. A community of hikers across Nigeria.
          </p>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-semibold text-white">Explore</p>
          <ul className="space-y-2">
            <li><Link href="/activities" className="hover:text-white">Our Activities</Link></li>
            <li><Link href="/community" className="hover:text-white">Community</Link></li>
            <li><Link href="/plan-your-adventure" className="hover:text-white">Plan Your Adventure</Link></li>
            <li><Link href="/about" className="hover:text-white">About Us</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-semibold text-white">Get involved</p>
          <ul className="space-y-2">
            <li><Link href="/signup" className="hover:text-white">Join the Club</Link></li>
            <li><Link href="/dashboard" className="hover:text-white">Member Dashboard</Link></li>
            <li><Link href="/login" className="hover:text-white">Sign in</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs">
        © {new Date().getFullYear()} The Hill Trekkers Club
      </div>
    </footer>
  );
}
