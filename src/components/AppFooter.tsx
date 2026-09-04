import Link from "next/link";
import { Mail } from "lucide-react";
import Logo from "@/components/Logo";

// Full site footer shared by every page (landing, user app, admin panel).
export default function AppFooter() {
  return (
    <footer className="border-t border-coffee-200 bg-coffee-950 py-12 text-coffee-200">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-4">
        <div>
          <Logo tone="dark" size="sm" />
          <p className="mt-3 text-sm leading-relaxed text-coffee-300">
            Get paid for your opinions. Take paid surveys, earn coins, and redeem them for PayPal
            cash and gift cards.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-coffee-400">Earn</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/signup" className="hover:text-white">Create account</Link></li>
            <li><Link href="/login" className="hover:text-white">Sign in</Link></li>
            <li><Link href="/dashboard" className="hover:text-white">Surveys</Link></li>
            <li><Link href="/rewards" className="hover:text-white">Redeem coins</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-coffee-400">Legal</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/terms" className="hover:text-white">Terms &amp; Conditions</Link></li>
            <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
            <li><Link href="/cookies" className="hover:text-white">Cookie Policy</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-coffee-400">Support</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href="mailto:support@skysurvey.com" className="inline-flex items-center gap-2 hover:text-white">
                <Mail size={14} aria-hidden="true" />
                support@skysurvey.com
              </a>
            </li>
            <li><Link href="/#faq" className="hover:text-white">FAQ</Link></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-6xl border-t border-coffee-800 px-4 pt-6 text-xs text-coffee-400">
        © {new Date().getFullYear()} SkySurvey. All rights reserved. · 1 coin = $0.01 · Minimum
        cashout 500 coins.
      </div>
    </footer>
  );
}
