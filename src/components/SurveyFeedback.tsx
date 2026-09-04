"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

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
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      {outcome === "completed" ? (
        <>
          <div className="text-6xl">🎉</div>
          <h1 className="mt-4 text-3xl font-bold text-coffee-900">Congratulations!</h1>
          <p className="mt-3 text-lg text-stone-600">
            You have completed <b>{surveyTitle}</b> and earned{" "}
            <b className="text-emerald-700">{coins} coins</b>.
          </p>
        </>
      ) : (
        <>
          <div className="text-6xl">😕</div>
          <h1 className="mt-4 text-3xl font-bold text-coffee-900">Sorry for the screenout!</h1>
          <p className="mt-3 text-lg text-stone-600">
            <b>{surveyTitle}</b> ended before completion — no coins for this one, but you can try
            another survey right away.
          </p>
          <div className="mx-auto mt-5 max-w-md rounded-xl bg-cream p-4 text-left text-sm text-stone-600 ring-1 ring-coffee-200">
            <p className="font-semibold text-coffee-900">Why does this happen?</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {REASONS.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        </>
      )}

      <div className="mt-8 rounded-2xl border border-coffee-200 bg-white p-6 shadow-sm">
        <p className="font-semibold text-coffee-900">Please rate this survey</p>
        <p className="mt-1 text-sm text-stone-500">
          {outcome === "completed"
            ? "How was the experience? Your rating helps other members."
            : "Was this survey worth trying? Your rating helps other members."}
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
              className={`text-4xl leading-none transition ${
                n <= stars ? "text-amber-400" : "text-stone-300 hover:text-amber-200"
              }`}
            >
              ★
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-stone-400">
          {stars ? `You rated ${stars} star${stars > 1 ? "s" : ""}` : "Rating is optional — pick stars or skip"}
        </p>
      </div>

      <button
        onClick={complete}
        disabled={loading}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-coffee-700 px-10 py-3 text-lg font-bold text-white hover:bg-coffee-800 disabled:opacity-50"
      >
        {loading && <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />}
        Complete
      </button>
    </div>
  );
}
