"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Hourglass, LoaderCircle, ShieldCheck, ShieldOff, UserCheck } from "lucide-react";

const HOLD_PRESETS = [
  { label: "6 hours", hours: 6 },
  { label: "12 hours", hours: 12 },
  { label: "1 day", hours: 24 },
  { label: "3 days", hours: 72 },
  { label: "7 days", hours: 168 },
  { label: "30 days", hours: 720 },
];

export default function AdminUserActions({
  userId,
  isActive,
  isFlagged,
  heldUntil,
}: {
  userId: number;
  isActive: boolean;
  isFlagged: boolean;
  heldUntil: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [showHold, setShowHold] = useState(false);
  const [holdHours, setHoldHours] = useState(24);
  const [holdReason, setHoldReason] = useState("");

  const isHeldNow = !!heldUntil && new Date(heldUntil).getTime() > Date.now();

  async function patch(body: Record<string, unknown>, key: string) {
    setPending(key);
    setError("");
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setPending("");
    if (!res.ok) {
      setError(data.error || "Action failed");
      return;
    }
    setShowHold(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {isFlagged && (
          <button
            onClick={() => patch({ isFlagged: false }, "flag")}
            disabled={!!pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {pending === "flag" ? (
              <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
            ) : (
              <ShieldCheck size={15} aria-hidden="true" />
            )}
            Clear fraud review
          </button>
        )}

        {isHeldNow ? (
          <button
            onClick={() => patch({ holdHours: null }, "hold")}
            disabled={!!pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {pending === "hold" ? (
              <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
            ) : (
              <ShieldOff size={15} aria-hidden="true" />
            )}
            Release hold
          </button>
        ) : (
          <button
            onClick={() => setShowHold((v) => !v)}
            disabled={!!pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            <Hourglass size={15} aria-hidden="true" />
            {showHold ? "Cancel hold setup" : "Hold account"}
          </button>
        )}

        <button
          onClick={() => patch({ isActive: !isActive }, "active")}
          disabled={!!pending}
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
            isActive ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {pending === "active" ? (
            <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
          ) : isActive ? (
            <Ban size={15} aria-hidden="true" />
          ) : (
            <UserCheck size={15} aria-hidden="true" />
          )}
          {isActive ? "Block user" : "Unblock user"}
        </button>
      </div>

      {showHold && !isHeldNow && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Hold this account — the user cannot earn until the hold ends.
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Use for suspicious activity such as bots, VPN or proxy usage. The user sees a banner
            with the remaining time; you can release the hold anytime.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {HOLD_PRESETS.map((p) => (
              <button
                key={p.hours}
                onClick={() => setHoldHours(p.hours)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  holdHours === p.hours
                    ? "border-amber-700 bg-amber-700 text-white"
                    : "border-amber-300 bg-white text-amber-800 hover:border-amber-500"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={holdReason}
            onChange={(e) => setHoldReason(e.target.value)}
            placeholder="Reason shown to the user (optional) — e.g. Bot / VPN usage suspected"
            className="mt-3 w-full rounded-lg border border-amber-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
          />
          <button
            onClick={() => patch({ holdHours, holdReason }, "hold")}
            disabled={!!pending}
            className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {pending === "hold" ? "Holding..." : `Hold for ${holdHours >= 24 ? `${holdHours / 24} day(s)` : `${holdHours} hours`}`}
          </button>
        </div>
      )}
    </div>
  );
}
