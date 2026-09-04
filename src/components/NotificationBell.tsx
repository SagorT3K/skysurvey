"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

// Header bell with an unread badge; polls the count so new events show up
// without a page reload.
export default function NotificationBell() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const data = await res.json();
        if (alive) setUnread(data.unread ?? 0);
      } catch {
        /* ignore polling errors */
      }
    };
    load();
    const timer = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <Link
      href="/notifications"
      title="Notifications"
      aria-label={`Notifications${unread ? ` — ${unread} unread` : ""}`}
      className="relative rounded-lg p-2 text-coffee-800 transition hover:bg-coffee-100"
    >
      <Bell size={18} aria-hidden="true" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
