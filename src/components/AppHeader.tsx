"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Coins,
  Gauge,
  LayoutDashboard,
  Menu,
  Trophy,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import Logo from "@/components/Logo";
import LogoutButton from "@/components/LogoutButton";
import NotificationBell from "@/components/NotificationBell";

const LINKS = [
  { href: "/dashboard", label: "Surveys", icon: LayoutDashboard, key: "surveys" },
  { href: "/rewards", label: "Rewards", icon: Coins, key: "rewards" },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy, key: "leaderboard" },
  { href: "/my-level", label: "My level", icon: Gauge, key: "mylevel" },
  { href: "/profile", label: "Profile", icon: UserRound, key: "profile" },
];

export default function AppHeader({
  active,
  balance,
}: {
  active: "surveys" | "rewards" | "profile" | "leaderboard" | "mylevel";
  balance: number;
}) {
  const [open, setOpen] = useState(false);

  const linkCls = (key: string) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 font-medium transition ${
      active === key
        ? "bg-white/10 font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
        : "text-slate-300 hover:bg-white/5 hover:text-white"
    }`;

  const coinPill =
    "flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 font-semibold text-amber-300 transition hover:bg-white/15";

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0a18]/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Logo href="/dashboard" tone="dark" size="sm" />

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 text-sm lg:flex">
          {LINKS.map(({ href, label, icon: Icon, key }) => (
            <Link key={key} href={href} aria-current={active === key ? "page" : undefined} className={linkCls(key)}>
              <Icon size={15} aria-hidden="true" />
              {label}
            </Link>
          ))}
          <NotificationBell />
          <Link
            href="/rewards"
            title="View your full coin history"
            className={`mx-2 ${coinPill}`}
          >
            <Coins size={16} aria-hidden="true" />
            {balance}
          </Link>
          <LogoutButton />
        </nav>

        {/* Mobile: balance + hamburger */}
        <div className="flex items-center gap-2 lg:hidden">
          <NotificationBell />
          <Link href="/rewards" title="View your full coin history" className={coinPill}>
            <Coins size={16} aria-hidden="true" />
            {balance}
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="rounded-lg p-2 text-slate-200 transition hover:bg-white/10"
          >
            {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="border-t border-white/10 bg-[#0d0b1f] px-4 pb-4 pt-2 lg:hidden">
          {LINKS.map(({ href, label, icon: Icon, key }) => (
            <Link
              key={key}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={active === key ? "page" : undefined}
              className={linkCls(key)}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </Link>
          ))}
          <div className="mt-2 border-t border-white/10 pt-2">
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300">
              <Wallet size={16} aria-hidden="true" />
              Balance: <b className="text-amber-300">{balance} coins</b>
              <Link href="/rewards" onClick={() => setOpen(false)} className="ml-auto text-xs font-semibold text-brand-300 underline underline-offset-2">
                history
              </Link>
            </div>
            <LogoutButton />
          </div>
        </nav>
      )}
    </header>
  );
}
