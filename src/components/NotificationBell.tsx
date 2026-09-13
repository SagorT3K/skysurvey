"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Bell } from "lucide-react";
import { TYPE_META } from "@/lib/notification-meta";

type Entry = {
  id: number;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

const PAGE_SIZE = 20;

// Facebook-style date separators.
function groupLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfToday.getDate() - 1);
  if (d >= startOfToday) return "Today";
  if (d >= startOfYesterday) return "Yesterday";
  const days = (startOfToday.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000;
  if (days < 7) return "This week";
  if (days < 30) return "This month";
  return "Earlier";
}

// Compact relative timestamp: now → 5m → 3h → 2d → date.
function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Header bell with unread badge. Clicking opens a Facebook-style floating
// panel: All/Unread tabs, date-grouped entries, infinite scroll, and the
// badge clears when the panel closes (same as the old page-visit behavior).
export default function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inflight = useRef(false);

  // Badge polling so new events show up without a reload.
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

  const load = useCallback(
    async (reset: boolean, whichTab: "all" | "unread", beforeId: number | null) => {
      if (inflight.current) return;
      if (!reset && beforeId === null) return;
      inflight.current = true;
      setLoading(true);
      try {
        const params = new URLSearchParams({ filter: whichTab });
        if (!reset && beforeId !== null) params.set("before", String(beforeId));
        const res = await fetch(`/api/notifications?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        const batch: Entry[] = data.entries ?? [];
        setEntries((prev) => (reset ? batch : [...prev, ...batch]));
        setUnread(data.unread ?? 0);
        setCursor(batch.length === PAGE_SIZE ? batch[batch.length - 1].id : null);
      } catch {
        /* ignore panel load errors */
      } finally {
        setLoading(false);
        inflight.current = false;
      }
    },
    []
  );

  const openPanel = useCallback(() => {
    setOpen(true);
    setEntries([]);
    setCursor(null);
    load(true, "all", null);
  }, [load]);

  const closePanel = useCallback(() => {
    setOpen(false);
    // Closing the panel clears the badge, matching the old page-visit rule.
    if (unread > 0) {
      fetch("/api/notifications", { method: "POST" }).catch(() => {});
      setUnread(0);
      setEntries((prev) => prev.map((e) => ({ ...e, read: true })));
    }
  }, [unread]);

  const markAllRead = useCallback(() => {
    fetch("/api/notifications", { method: "POST" }).catch(() => {});
    setUnread(0);
    setEntries((prev) => prev.map((e) => ({ ...e, read: true })));
  }, []);

  // Escape closes the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closePanel]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el || loading || cursor === null) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      load(false, tab, cursor);
    }
  };

  const switchTab = (t: "all" | "unread") => {
    if (t === tab) return;
    setTab(t);
    setEntries([]);
    setCursor(null);
    load(true, t, null);
  };

  // Interleave date-separator headers when the group label changes.
  const rendered: ReactNode[] = [];
  let lastLabel = "";
  for (const n of entries) {
    const label = groupLabel(n.createdAt);
    if (label !== lastLabel) {
      rendered.push(
        <p
          key={`sep-${label}-${n.id}`}
          className="sticky top-0 z-10 border-b border-white/10 bg-[#14112b]/95 px-4 py-2 text-xs font-bold uppercase tracking-wide text-brand-300 backdrop-blur"
        >
          {label}
        </p>
      );
      lastLabel = label;
    }
    const meta = TYPE_META[n.type] ?? TYPE_META.system;
    const Icon = meta.icon;
    rendered.push(
      <div
        key={n.id}
        className={`flex items-start gap-3 px-4 py-3 ${!n.read ? "bg-brand-600/15" : "bg-transparent"}`}
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.cls}`}>
          <Icon size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm leading-snug ${!n.read ? "font-semibold text-white" : "text-slate-300"}`}>
            {n.title}
          </p>
          {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.body}</p>}
        </div>
        <span className="ml-1 flex shrink-0 items-center gap-1.5 pt-0.5">
          <span className="text-[11px] text-slate-500">{relTime(n.createdAt)}</span>
          {!n.read && <span className="h-2 w-2 rounded-full bg-red-500" aria-label="new" />}
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (open ? closePanel() : openPanel())}
        title="Notifications"
        aria-label={`Notifications${unread ? ` — ${unread} unread` : ""}`}
        aria-expanded={open}
        className="relative rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
      >
        <Bell size={18} aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={closePanel} aria-hidden="true" />
          <div className="fixed right-2 top-14 z-50 flex h-[70vh] max-h-[32rem] w-[calc(100vw-1rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#12101f] shadow-2xl shadow-black/50 sm:right-4">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="font-bold text-white">Notifications</p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs font-semibold text-brand-300 hover:text-brand-200 hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>
            <div className="flex gap-1 border-b border-white/10 px-3 py-2">
              {(["all", "unread"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => switchTab(t)}
                  className={`rounded-full px-3.5 py-1 text-sm font-semibold capitalize transition ${
                    tab === t
                      ? "bg-white/10 text-white"
                      : "text-slate-400 hover:bg-white/5"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div ref={listRef} onScroll={onScroll} className="flex-1 overflow-y-auto">
              {entries.length === 0 && !loading ? (
                <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500">
                  {tab === "unread"
                    ? "You're all caught up — no unread notifications."
                    : "Nothing here yet. Complete your first survey and notifications will show up here."}
                </div>
              ) : (
                rendered
              )}
              {loading && (
                <p className="p-3 text-center text-xs text-slate-500">Loading…</p>
              )}
              {!loading && cursor === null && entries.length > 0 && (
                <p className="p-3 text-center text-xs text-slate-500">You&apos;re all caught up</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
