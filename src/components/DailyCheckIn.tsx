"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Coins, Flame, LoaderCircle } from "lucide-react";

export default function DailyCheckIn({ available, coins }: { available: boolean; coins: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function checkIn() {
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/rewards/daily", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMsg({ ok: false, text: data.error || "Check-in failed" });
      return;
    }
    setMsg({ ok: true, text: `+${data.coins} coins added to your balance!` });
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-coffee-300 bg-gradient-to-br from-coffee-800 to-coffee-950 p-6 text-white shadow-md">
      <div>
        <div className="flex items-center gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              available ? "bg-coffee-400/20 text-coffee-300" : "bg-white/5 text-coffee-500"
            }`}
          >
            <Flame size={22} strokeWidth={2.1} className={available ? "animate-pulse" : ""} aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-bold">Daily check-in</h3>
            <p className="flex items-center gap-1.5 text-sm text-coffee-200">
              <Coins size={14} aria-hidden="true" />
              {coins} coins every 24 hours
            </p>
          </div>
        </div>
        {msg && (
          <p className={`mt-4 rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-500/20 text-emerald-200" : "bg-red-500/20 text-red-200"}`}>
            {msg.text}
          </p>
        )}
      </div>
      <button
        onClick={checkIn}
        disabled={!available || loading}
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-coffee-300 py-2.5 text-sm font-bold text-coffee-950 transition hover:bg-coffee-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {!available ? (
          <>
            <Check size={16} aria-hidden="true" />
            Checked in today
          </>
        ) : loading ? (
          <>
            <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
            Checking in
          </>
        ) : (
          `Claim ${coins} coins`
        )}
      </button>
    </div>
  );
}
