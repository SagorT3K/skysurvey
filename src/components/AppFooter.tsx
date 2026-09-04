import Link from "next/link";

export default function AppFooter() {
  return (
    <footer className="border-t border-coffee-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-stone-500">
        <p>© {new Date().getFullYear()} SkySurvey · 1 coin = $0.01 · Minimum cashout 500 coins</p>
        <nav className="flex items-center gap-4">
          <Link href="/terms" className="hover:text-coffee-900">Terms</Link>
          <Link href="/privacy" className="hover:text-coffee-900">Privacy</Link>
          <Link href="/cookies" className="hover:text-coffee-900">Cookies</Link>
          <a href="mailto:support@skysurvey.com" className="hover:text-coffee-900">Support</a>
        </nav>
      </div>
    </footer>
  );
}
