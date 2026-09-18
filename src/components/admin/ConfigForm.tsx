"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const FIELDS: { key: string; label: string; hint: string }[] = [
  { key: "site_name", label: "Site name", hint: "Brand shown across the site" },
  { key: "coin_rate_cents", label: "1 coin value (US cents)", hint: "1 = 1 coin equals $0.01" },
  { key: "reward_share_percent", label: "Reward share (%)", hint: "% of router CPI credited to users as coins (your margin is the rest)" },
  { key: "min_cashout_coins", label: "Minimum cashout (coins)", hint: "500 coins = $5 at default rate" },
  { key: "signup_bonus_coins", label: "Signup bonus (coins)", hint: "Granted on account creation. Set 0 to hide the signup offer from the landing page." },
  { key: "referral_bonus_coins", label: "Referral bonus (coins)", hint: "Granted to the inviter per signup" },
  { key: "daily_bonus_coins", label: "Daily bonus (coins)", hint: "Claimed once every 24 hours from the dashboard" },
  { key: "max_accounts_per_ip", label: "Max accounts / IP", hint: "0 = unlimited (no cap). A positive value flags extra accounts created from one IP and blocks their survey entry" },
];

export default function ConfigForm({ initial }: { initial: Record<string, string | number> }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, String(v)])),
  );
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    const res = await fetch("/api/admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMsg({ ok: false, text: data.error || "Save failed" });
      return;
    }
    setMsg({ ok: true, text: "Settings saved." });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      {FIELDS.map((f) => (
        <div key={f.key}>
          <label className="mb-1 block text-sm font-medium text-slate-700">{f.label}</label>
          <input
            value={values[f.key] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <p className="mt-0.5 text-xs text-slate-400">{f.hint}</p>
        </div>
      ))}
      {msg && (
        <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
          {msg.text}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-brand-600 px-6 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "Saving..." : "Save settings"}
      </button>
    </form>
  );
}
