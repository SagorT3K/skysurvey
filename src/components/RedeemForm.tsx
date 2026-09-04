"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bitcoin, Gift, Wallet } from "lucide-react";
import { REDEEM_METHODS, REDEEM_AMOUNT_CENTS, methodLabel } from "@/lib/redeem";

type Group = "paypal" | "giftcard" | "crypto";

const GROUPS: { id: Group; label: string; icon: typeof Wallet }[] = [
  { id: "paypal", label: "PayPal", icon: Wallet },
  { id: "giftcard", label: "Gift card", icon: Gift },
  { id: "crypto", label: "Crypto", icon: Bitcoin },
];

export default function RedeemForm({
  withdrawable,
  minCoins,
  coinRateCents,
  defaultEmail,
}: {
  withdrawable: number;
  minCoins: number;
  coinRateCents: number;
  defaultEmail: string;
}) {
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [method, setMethod] = useState<string | null>(null);
  const [amountCents, setAmountCents] = useState<number | null>(null);
  const [destination, setDestination] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const enough = withdrawable >= minCoins;
  const groupMethods = REDEEM_METHODS.filter((m) => m.group === group);
  const needsEmail = group === "paypal";
  const needsWallet = group === "crypto";
  const amountCoins = amountCents ? Math.round(amountCents / coinRateCents) : 0;
  const methodReady =
    !!group &&
    !!method &&
    !!amountCents &&
    (!needsEmail || destination.includes("@")) &&
    (!needsWallet || destination.trim().length >= 20);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!group || !method || !amountCents) return;
    setMsg(null);
    setLoading(true);
    const res = await fetch("/api/rewards/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountCents, method, destination }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMsg({ ok: false, text: data.error || "Request failed" });
      return;
    }
    setMsg({
      ok: true,
      text: `Request #${data.seq} submitted — ${methodLabel(method)}, $${(amountCents / 100).toFixed(2)}. Admin will review and pay.`,
    });
    setMethod(null);
    setAmountCents(null);
    setDestination("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Step 1 — payout method group */}
      <div>
        <p className="mb-2 text-sm font-semibold text-stone-700">1 · How do you want to get paid?</p>
        <div className="grid grid-cols-3 gap-2">
          {GROUPS.map((g) => {
            const Icon = g.icon;
            const active = group === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  setGroup(g.id);
                  setMethod(null);
                  setDestination("");
                }}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition ${
                  active
                    ? "border-coffee-600 bg-coffee-100 text-coffee-900 ring-2 ring-coffee-200"
                    : "border-stone-300 bg-white text-stone-600 hover:border-coffee-400"
                }`}
              >
                <Icon size={20} aria-hidden="true" />
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2 — specific method inside the chosen group */}
      {group && (
        <div>
          <p className="mb-2 text-sm font-semibold text-stone-700">2 · Choose one</p>
          <div className="flex flex-wrap gap-2">
            {groupMethods.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  method === m.id
                    ? "border-coffee-600 bg-coffee-700 text-white"
                    : "border-stone-300 bg-white text-stone-700 hover:border-coffee-400"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3 — fixed amount */}
      {method && (
        <div>
          <p className="mb-2 text-sm font-semibold text-stone-700">3 · Amount</p>
          <div className="grid grid-cols-3 gap-2">
            {REDEEM_AMOUNT_CENTS.map((cents) => {
              const coins = Math.round(cents / coinRateCents);
              return (
                <button
                  key={cents}
                  type="button"
                  onClick={() => setAmountCents(cents)}
                  disabled={coins > withdrawable}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    amountCents === cents
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-stone-300 bg-white text-stone-700 hover:border-emerald-400"
                  }`}
                >
                  ${(cents / 100).toFixed(0)}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-stone-500">
            {amountCents
              ? `Costs ${amountCoins.toLocaleString()} coins (1 coin = $${(coinRateCents / 100).toFixed(2)}).`
              : "Higher options unlock as you collect more withdrawable coins."}
          </p>
        </div>
      )}

      {/* Step 4 — where the payout goes */}
      {method && needsEmail && (
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
      )}
      {method && needsWallet && (
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">Wallet address</label>
          <input
            type="text"
            required
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-coffee-500 focus:ring-2 focus:ring-coffee-100"
            placeholder="Your BTC / USDT wallet address"
          />
        </div>
      )}
      {method && group === "giftcard" && (
        <p className="rounded-lg bg-coffee-50 px-3 py-2 text-sm text-stone-600">
          The gift card code will be emailed to <b>{defaultEmail}</b>.
        </p>
      )}

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
        disabled={loading || !enough || !methodReady}
        className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {!enough
          ? `Need ${(minCoins - withdrawable).toLocaleString()} more withdrawable coins`
          : loading
            ? "Submitting..."
            : "Request redemption"}
      </button>
    </form>
  );
}
