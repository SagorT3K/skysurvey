"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RedeemForm({
  withdrawable,
  minCoins,
  defaultEmail,
}: {
  withdrawable: number;
  minCoins: number;
  defaultEmail: string;
}) {
  const router = useRouter();
  const [coins, setCoins] = useState(String(minCoins));
  const [destination, setDestination] = useState(defaultEmail);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const amount = (Number(coins) || 0) * 0.01;
  const enough = withdrawable >= minCoins;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    const res = await fetch("/api/rewards/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coins: Number(coins), destination }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMsg({ ok: false, text: data.error || "Request failed" });
      return;
    }
    setMsg({ ok: true, text: `Request #${data.redeemId} submitted! Admin will review and pay via PayPal.` });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">PayPal email</label>
        <input
          type="email"
          required
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-coffee-500 focus:ring-2 focus:ring-coffee-100"
          placeholder="your-paypal@example.com"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">
          Coins to redeem (min {minCoins})
        </label>
        <input
          type="number"
          required
          min={minCoins}
          step={1}
          value={coins}
          onChange={(e) => setCoins(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-coffee-500 focus:ring-2 focus:ring-coffee-100"
        />
        <p className="mt-1 text-sm text-stone-500">You will receive ${amount.toFixed(2)} via PayPal.</p>
      </div>
      {msg && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
          }`}
        >
          {msg.text}
        </p>
      )}
      <button
        type="submit"
        disabled={loading || !enough}
        className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {enough ? (loading ? "Submitting..." : "Request cashout") : `Need ${minCoins - withdrawable} more withdrawable coins`}
      </button>
    </form>
  );
}
