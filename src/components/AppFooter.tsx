import Link from "next/link";

// Slim, professional one-line footer shared by every page.
// `variant="app"` (logged-in pages) shows in-app links; public pages show
// create account / sign in.
export default function AppFooter({ variant = "public" }: { variant?: "public" | "app" }) {
  return (
    <footer className="border-t border-coffee-200 bg-coffee-950 py-5 text-coffee-300">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 text-sm">
        <p className="font-semibold text-coffee-100">SkySurvey · 1 coin = $0.01 · min cashout 500 coins</p>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {variant === "app" ? (
            <>
              <Link href="/dashboard" className="hover:text-white">Surveys</Link>
              <Link href="/rewards" className="hover:text-white">Rewards</Link>
              <Link href="/leaderboard" className="hover:text-white">Leaderboard</Link>
              <Link href="/my-level" className="hover:text-white">My level</Link>
              <Link href="/profile" className="hover:text-white">Profile</Link>
            </>
          ) : (
            <>
              <Link href="/signup" className="hover:text-white">Create account</Link>
              <Link href="/login" className="hover:text-white">Sign in</Link>
            </>
          )}
          <Link href="/terms" className="hover:text-white">Terms</Link>
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
          <a href="mailto:support@skysurvey.com" className="hover:text-white">Support</a>
        </nav>
      </div>
      <div className="mx-auto mt-3 max-w-6xl border-t border-coffee-800 px-4 pt-3 text-xs text-coffee-500">
        © {new Date().getFullYear()} SkySurvey. All rights reserved.
      </div>
    </footer>
  );
}
