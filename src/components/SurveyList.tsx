"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Coins, LoaderCircle, TriangleAlert } from "lucide-react";

export type SurveyCardData = {
  id: number;
  title: string;
  category: string;
  loiMinutes: number;
  coins: number;
  done: boolean;
};

export default function SurveyList({ surveys }: { surveys: SurveyCardData[] }) {
  const router = useRouter();
  const [startingId, setStartingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function start(id: number) {
    setStartingId(id);
    setError("");
    const res = await fetch(`/api/surveys/${id}/start`, { method: "POST" });
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
    <div className="grid gap-4 md:grid-cols-2">
      {surveys.map((s) => (
        <div key={s.id} className="flex items-center justify-between rounded-xl border border-coffee-200 bg-white p-5 transition hover:border-coffee-300 hover:shadow-sm">
          <div className="pr-4">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-coffee-50 px-2 py-0.5 text-xs font-medium text-coffee-700">
                {s.category}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-stone-400">
                <Clock size={12} aria-hidden="true" />
                ~{s.loiMinutes} min
              </span>
            </div>
            <h3 className="mt-1.5 font-semibold text-stone-900">{s.title}</h3>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
              <Coins size={15} aria-hidden="true" />
              {s.coins} coins
            </p>
          </div>
          <button
            onClick={() => start(s.id)}
            disabled={s.done || startingId === s.id}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-coffee-700 px-4 py-2 text-sm font-semibold text-white hover:bg-coffee-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {s.done ? (
              <>
                <Check size={15} aria-hidden="true" />
                Completed
              </>
            ) : startingId === s.id ? (
              <>
                <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
                Starting
              </>
            ) : (
              "Start"
            )}
          </button>
        </div>
      ))}
      {error && (
        <p className="inline-flex items-center gap-2 text-sm text-red-600 md:col-span-2">
          <TriangleAlert size={15} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
