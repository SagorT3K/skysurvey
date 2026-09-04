import Link from "next/link";
import { Coins, LayoutDashboard, UserRound } from "lucide-react";
import Logo from "@/components/Logo";
import LogoutButton from "@/components/LogoutButton";

export default function AppHeader({
  active,
  balance,
}: {
  active: "surveys" | "rewards" | "profile";
  balance: number;
}) {
  const item =
    "rounded-lg px-3 py-1.5 font-medium transition hover:bg-coffee-100";
  return (
    <header className="sticky top-0 z-40 border-b border-coffee-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Logo href="/dashboard" size="sm" />
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/dashboard"
            aria-current={active === "surveys" ? "page" : undefined}
            className={`${item} ${
              active === "surveys"
                ? "bg-coffee-100 font-semibold text-coffee-900"
                : "text-stone-600 hover:text-coffee-900"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <LayoutDashboard size={15} aria-hidden="true" />
              Surveys
            </span>
          </Link>
          <Link
            href="/rewards"
            aria-current={active === "rewards" ? "page" : undefined}
            className={`${item} ${
              active === "rewards"
                ? "bg-coffee-100 font-semibold text-coffee-900"
                : "text-stone-600 hover:text-coffee-900"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Coins size={15} aria-hidden="true" />
              Rewards
            </span>
          </Link>
          <Link
            href="/profile"
            aria-current={active === "profile" ? "page" : undefined}
            className={`${item} ${
              active === "profile"
                ? "bg-coffee-100 font-semibold text-coffee-900"
                : "text-stone-600 hover:text-coffee-900"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <UserRound size={15} aria-hidden="true" />
              Profile
            </span>
          </Link>
          <span className="mx-2 hidden items-center gap-1.5 rounded-lg bg-coffee-100 px-3 py-1.5 font-semibold text-coffee-800 sm:flex">
            <Coins size={16} aria-hidden="true" />
            {balance}
          </span>
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
