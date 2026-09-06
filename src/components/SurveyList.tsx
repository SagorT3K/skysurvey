"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Coins, LoaderCircle, ShieldCheck, Star, TriangleAlert, X } from "lucide-react";

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
  const [selected, setSelected] = useState<SurveyCardData | null>(null);
  const [error, setError] = useState("");

  // Escape closes the detail card; backdrop click does too.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

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
    setSelected(null);
    router.push(data.redirect);
  }

  if (surveys.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-coffee-300 bg-white p-10 text-center text-stone-500">
        No surveys available for your country right now — check back soon.
      </div>
    );
  }

  const starting = selected ? startingId === selected.id : false;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {surveys.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelected(s)}
            disabled={s.done}
            title={`${s.title} · ${s.category}`}
            aria-label={s.done ? `${s.title} (completed)` : `View ${s.title} details`}
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
        ))}
      </div>
      {error && (
        <p className="mt-3 inline-flex items-center gap-2 text-sm text-red-600">
          <TriangleAlert size={15} aria-hidden="true" />
          {error}
        </p>
      )}

      {/* Survey detail card — shown before anything starts, like the big survey
          sites: the grid card only opens this preview. */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => !starting && setSelected(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${selected.title} details`}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="rounded-md bg-coffee-50 px-2 py-0.5 text-xs font-medium text-coffee-700">
                  {selected.category}
                </span>
                <h3 className="mt-2 text-lg font-bold leading-snug text-stone-900">
                  {selected.title}
                </h3>
              </div>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl bg-cream p-4">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600">
                <Clock size={15} className="text-stone-400" aria-hidden="true" />
                ~{selected.loiMinutes} min
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700">
                <Coins size={15} aria-hidden="true" />
                {selected.coins} coins
                {selected.usd != null && (
                  <span className="font-medium text-stone-400">(${selected.usd.toFixed(2)})</span>
                )}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Stars avg={selected.avgStars} />
                {selected.ratingCount ? (
                  <span className="text-xs text-stone-400">({selected.ratingCount})</span>
                ) : (
                  <span className="text-xs text-stone-400">No ratings yet</span>
                )}
              </span>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-stone-600">
              Answer a set of questions about your opinions and habits. Finish the survey to the
              end and the coins above are credited to your balance automatically — no need to
              claim anything.
            </p>
            <p className="mt-2 inline-flex items-start gap-1.5 text-xs text-stone-500">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
              Stay honest and consistent — low-quality or contradictory answers may not be
              credited by the research partner.
            </p>

            {error && (
              <p className="mt-3 inline-flex items-center gap-2 text-sm text-red-600">
                <TriangleAlert size={15} aria-hidden="true" />
                {error}
              </p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setSelected(null)}
                disabled={starting}
                className="flex-1 rounded-xl border border-stone-200 px-4 py-3 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Maybe later
              </button>
              <button
                onClick={() => start(selected)}
                disabled={starting}
                className="inline-flex flex-[2] items-center justify-center gap-2 rounded-xl bg-coffee-700 px-4 py-3 text-sm font-bold text-white hover:bg-coffee-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {starting ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                    Starting…
                  </>
                ) : (
                  "Start survey"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
