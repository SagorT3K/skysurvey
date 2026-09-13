"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Save } from "lucide-react";

type Options = Record<string, string[]>;

const FIELDS: { key: string; label: string; hint: string }[] = [
  { key: "gender", label: "Gender", hint: "Shown to survey matching only" },
  { key: "ageGroup", label: "Age group", hint: "Pick the group you belong to" },
  { key: "ethnicity", label: "Ethnicity", hint: "Required by some research studies" },
  { key: "education", label: "Education", hint: "Your highest completed level" },
  { key: "householdIncome", label: "Household income", hint: "Everyone living in your home" },
  { key: "employment", label: "Employment status", hint: "Your current main activity" },
];

export default function ProfileForm({
  initial,
  options,
}: {
  initial: Record<string, string>;
  options: Options;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  function set(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setMsg({ ok: false, text: data.error || "Could not save profile" });
      return;
    }
    setMsg({ ok: true, text: "Profile saved." });
    router.refresh();
  }

  const input =
    "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20";

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-200">Display name</span>
          <input
            type="text"
            value={values.username ?? ""}
            onChange={(e) => set("username", e.target.value)}
            className={input}
            placeholder="How you appear on leaderboards"
            maxLength={40}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-200">State / region</span>
          <input
            type="text"
            value={values.state ?? ""}
            onChange={(e) => set("state", e.target.value)}
            className={input}
            placeholder="e.g. California"
            maxLength={60}
          />
        </label>
        {FIELDS.map(({ key, label, hint }) => (
          <label key={key} className="block">
            <span className="mb-1 block text-sm font-medium text-slate-200">{label}</span>
            <select
              value={values[key] ?? ""}
              onChange={(e) => set(key, e.target.value)}
              className={input}
            >
              {(options[key] ?? [""]).map((opt) => (
                <option key={opt} value={opt}>
                  {opt || "Select…"}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-slate-500">{hint}</span>
          </label>
        ))}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-200">PayPal email (payouts)</span>
          <input
            type="email"
            value={values.paypalEmail ?? ""}
            onChange={(e) => set("paypalEmail", e.target.value)}
            className={input}
            placeholder="your-paypal@example.com"
          />
          <span className="mt-1 block text-xs text-slate-500">
            Pre-fills the cashout form. Gift cards go to your account email.
          </span>
        </label>
      </div>

      {msg && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            msg.ok ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
          }`}
        >
          {msg.text}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-900/40 hover:shadow-brand-700/40 disabled:opacity-50"
      >
        {loading ? (
          <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          <Save size={16} aria-hidden="true" />
        )}
        Save profile
      </button>
    </form>
  );
}
