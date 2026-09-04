"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Coins, LoaderCircle } from "lucide-react";

const REASONS = [
  "The survey quota was already full",
  "Your profile did not match this study",
  "Answer quality or speed failed the partner's check",
  "You had already taken a similar survey",
];

export default function SurveyFeedback({
  attemptId,
  outcome,
  coins,
  surveyTitle,
}: {
  attemptId: number;
  outcome: "completed" | "screenout";
  coins: number;
  surveyTitle: string;
}) {
  const router = useRouter();
  const [stars, setStars] = useState(0);
  const [loading, setLoading] = useState(false);
  const completed = outcome === "completed";

  async function complete() {
    setLoading(true);
    await fetch(`/api/attempts/${attemptId}/acknowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stars }),
    });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex-1 px-4 py-10">
      <div className="mx-auto max-w-md overflow-hidden rounded-3xl border border-coffee-200 bg-white shadow-xl">
        {/* status strip */}
        <div className={`h-1.5 w-full ${completed ? "bg-emerald-500" : "bg-amber-400"}`} />

        <div className="px-6 pb-7 pt-8 text-center sm:px-8">
          {/* icon badge */}
          <div
            className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
              completed ? "bg-emerald-100" : "bg-amber-100"
            }`}
          >
            {completed ? (
              <Check size={44} strokeWidth={3} className="text-emerald-600" aria-hidden="true" />
            ) : (
              <AlertTriangle size={40} className="text-amber-500" aria-hidden="true" />
            )}
          </div>

          <h1 className="mt-5 text-2xl font-bold text-coffee-900">
            {completed ? "Survey completed!" : "Screened out"}
          </h1>

          {completed ? (
            <p className="mt-2 text-stone-600">
              Nice work — <b className="text-coffee-900">{surveyTitle}</b> is done and your reward
              is already in your balance.
            </p>
          ) : (
            <p className="mt-2 text-stone-600">
              <b className="text-coffee-900">{surveyTitle}</b> ended early. No coins this time —
              here is why that happens:
            </p>
          )}

          {/* reward pill / reasons */}
          {completed ? (
            <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-5 py-2.5">
              <Coins size={20} className="text-emerald-700" aria-hidden="true" />
              <span className="text-lg font-bold text-emerald-800">+{coins} coins</span>
            </div>
          ) : (
            <ul className="mx-auto mt-4 max-w-xs space-y-1.5 rounded-xl bg-cream p-4 text-left text-sm text-stone-600 ring-1 ring-coffee-200">
              {REASONS.map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" aria-hidden="true" />
                  {r}
                </li>
              ))}
            </ul>
          )}

          <div className="my-6 border-t border-dashed border-coffee-200" />

          {/* rating */}
          <p className="font-semibold text-coffee-900">Rate this survey</p>
          <p className="mt-1 text-xs text-stone-500">
            {completed
              ? "How was the experience? Help other members pick good surveys."
              : "Tell us how it felt — it helps other members spot the good ones."}
          </p>
          <div className="mt-3 flex justify-center gap-1.5" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={stars === n}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                onClick={() => setStars(stars === n ? 0 : n)}
                className={`text-4xl leading-none transition-transform hover:scale-110 ${
                  n <= stars ? "scale-110 text-amber-400" : "text-stone-300"
                }`}
              >
                ★
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-stone-400">
            {stars
              ? `You rated ${stars} star${stars > 1 ? "s" : ""}`
              : "Optional — pick stars or skip"}
          </p>

          <button
            onClick={complete}
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-coffee-700 py-3 text-base font-bold text-white hover:bg-coffee-800 disabled:opacity-50"
          >
            {loading ? (
              <LoaderCircle size={18} className="mx-auto animate-spin" aria-hidden="true" />
            ) : (
              "Continue to surveys"
            )}
          </button>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-stone-400">
        Ratings stay anonymous and are shown as an average on the survey card.
      </p>
    </div>
  );
}
