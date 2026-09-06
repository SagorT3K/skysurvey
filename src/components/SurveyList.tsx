"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, LoaderCircle, Star, TriangleAlert } from "lucide-react";

export type SurveyCardData = {
  id: number | string;
  // Live router inventory: when set, Start goes through the per-user live API
  // instead of a Survey table row.
  liveProvider?: string;
  liveId?: string;
  title: string;
  category: string;
  loiMinutes: number;
  coins: number;
  usd?: number; // dollar value shown as the card's headline
  done: boolean;
  avgStars?: number | null; // community difficulty rating
  ratingCount?: number;
  completedCount?: number;
};

function Stars({ avg }: { avg?: number | null }) {
  const filled = Math.round(avg ?? 0);
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={13}
          className={i <= filled ? "fill-amber-400 text-amber-400" : "fill-stone-200 text-stone-200"}
        />
      ))}
    </span>
  );
}

export default function SurveyList({ surveys }: { surveys: SurveyCardData[] }) {
  const router = useRouter();
  const [startingId, setStartingId] = useState<number | string | null>(null);
  const [error, setError] = useState("");

  async function start(s: SurveyCardData) {
    setStartingId(s.id);
    setError("");
    const res = await fetch(
      s.liveProvider ? "/api/surveys/live/start" : `/api/surveys/${s.id}/start`,
      {
        method: "POST",
        ...(s.liveProvider
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ provider: s.liveProvider, externalId: s.liveId }),
            }
          : {}),
      },
    );
    const data = await res.json();
    setStartingId(null);
    if (!res.ok) {
      setError(data.error || "Could not start the survey");
      return;
    }
    router.push(data.redirect);
  }

  if (surveys.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-coffee-300 bg-white p-10 text-center text-stone-500">
        No surveys available for your country right now — check back soon.
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {surveys.map((s) => {
          const starting = startingId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => start(s)}
              disabled={s.done || starting}
              title={`${s.title} · ${s.category}`}
              aria-label={s.done ? `${s.title} (completed)` : `Start ${s.title}`}
              className="flex flex-col gap-1.5 rounded-xl border border-stone-200 bg-white p-4 text-left transition hover:border-coffee-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500">
                <Clock size={13} aria-hidden="true" />~{s.loiMinutes} min
              </span>
              {s.done ? (
                <span className="inline-flex items-center gap-1.5 text-lg font-bold text-stone-400">
                  <Check size={18} aria-hidden="true" />
                  Completed
                </span>
              ) : starting ? (
                <span className="inline-flex items-center gap-1.5 text-lg font-bold text-stone-400">
                  <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
                  Starting…
                </span>
              ) : s.usd != null ? (
                <span className="text-xl font-bold text-emerald-700">
                  ${s.usd.toFixed(2)}{" "}
                  <span className="text-xs font-semibold text-stone-400">USD</span>
                </span>
              ) : (
                <span className="text-xl font-bold text-emerald-700">
                  {s.coins}{" "}
                  <span className="text-xs font-semibold text-stone-400">coins</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Stars avg={s.avgStars} />
                {s.ratingCount ? (
                  <span className="text-xs text-stone-400">({s.ratingCount})</span>
                ) : null}
              </span>
              <span className="text-xs font-medium text-emerald-600">≈ {s.coins} coins</span>
            </button>
          );
        })}
      </div>
      {error && (
        <p className="mt-3 inline-flex items-center gap-2 text-sm text-red-600">
          <TriangleAlert size={15} aria-hidden="true" />
          {error}
        </p>
      )}
    </>
  );
}
