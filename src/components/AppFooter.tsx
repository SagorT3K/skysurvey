import Link from "next/link";
import Logo from "@/components/Logo";

// Compact site footer: keeps the 4-column structure of the landing footer but
// tighter — smaller padding, no tagline, one-line link lists.
// `variant="app"` (logged-in pages) swaps create account / sign in for the
// in-app navigation.
export default function AppFooter({ variant = "public" }: { variant?: "public" | "app" }) {
  return (
    <footer className="border-t border-coffee-200 bg-coffee-950 py-7 text-coffee-300">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <Logo tone="dark" size="sm" />
          <p className="mt-2 text-xs text-coffee-400">1 coin = $0.01 · min cashout 500 coins</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-coffee-500">Earn</p>
          <ul className="mt-2 space-y-1 text-sm">
            {variant === "app" ? (
              <>
                <li><Link href="/dashboard" className="hover:text-white">Surveys</Link></li>
                <li><Link href="/rewards" className="hover:text-white">Redeem coins</Link></li>
                <li><Link href="/leaderboard" className="hover:text-white">Leaderboard</Link></li>
                <li><Link href="/my-level" className="hover:text-white">My level</Link></li>
              </>
            ) : (
              <>
                <li><Link href="/signup" className="hover:text-white">Create account</Link></li>
                <li><Link href="/login" className="hover:text-white">Sign in</Link></li>
                <li><Link href="/dashboard" className="hover:text-white">Surveys</Link></li>
              </>
            )}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-coffee-500">Legal</p>
          <ul className="mt-2 space-y-1 text-sm">
            <li><Link href="/terms" className="hover:text-white">Terms</Link></li>
            <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li>
            <li><Link href="/cookies" className="hover:text-white">Cookies</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-coffee-500">Support</p>
          <ul className="mt-2 space-y-1 text-sm">
            <li><a href="mailto:support@skysurvey.com" className="hover:text-white">support@skysurvey.com</a></li>
            <li><Link href="/#faq" className="hover:text-white">FAQ</Link></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-5 max-w-6xl border-t border-coffee-800 px-4 pt-3 text-xs text-coffee-500">
        © {new Date().getFullYear()} SkySurvey. All rights reserved.
      </div>
    </footer>
  );
}
