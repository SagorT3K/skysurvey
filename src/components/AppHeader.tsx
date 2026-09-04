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
        ? "bg-coffee-100 font-semibold text-coffee-900"
        : "text-stone-600 hover:bg-coffee-100 hover:text-coffee-900"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-coffee-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Logo href="/dashboard" size="sm" />

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
            className="mx-2 flex items-center gap-1.5 rounded-lg bg-coffee-100 px-3 py-1.5 font-semibold text-coffee-800 transition hover:bg-coffee-200"
          >
            <Coins size={16} aria-hidden="true" />
            {balance}
          </Link>
          <LogoutButton />
        </nav>

        {/* Mobile: balance + hamburger */}
        <div className="flex items-center gap-2 lg:hidden">
          <NotificationBell />
          <Link
            href="/rewards"
            title="View your full coin history"
            className="flex items-center gap-1.5 rounded-lg bg-coffee-100 px-3 py-1.5 font-semibold text-coffee-800"
          >
            <Coins size={16} aria-hidden="true" />
            {balance}
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="rounded-lg p-2 text-coffee-800 transition hover:bg-coffee-100"
          >
            {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="border-t border-coffee-200 bg-white px-4 pb-4 pt-2 lg:hidden">
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
          <div className="mt-2 border-t border-coffee-100 pt-2">
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-600">
              <Wallet size={16} aria-hidden="true" />
              Balance: <b className="text-coffee-800">{balance} coins</b>
              <Link href="/rewards" onClick={() => setOpen(false)} className="ml-auto text-xs font-semibold text-coffee-700 underline underline-offset-2">
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
