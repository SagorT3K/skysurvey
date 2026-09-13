"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Coins, LoaderCircle } from "lucide-react";

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
    <div className="glass-card glass-hover flex h-full flex-col justify-between rounded-2xl p-6 text-white">
      <div>
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/flame.svg"
            alt=""
            width={44}
            height={44}
            className={`h-11 w-11 shrink-0 drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)] ${available ? "" : "opacity-40 grayscale"}`}
            aria-hidden="true"
          />
          <div>
            <h3 className="font-bold">Daily check-in</h3>
            <p className="flex items-center gap-1.5 text-sm text-amber-200/90">
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
        className="btn-shine mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/90 py-2.5 text-sm font-bold text-brand-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
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
