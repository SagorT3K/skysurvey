"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CompleteMockSurvey({
  attemptId,
  disabled,
}: {
  attemptId: number;
  disabled: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"complete" | "screenout" | null>(null);
  const [error, setError] = useState("");

  async function finish(kind: "complete" | "screenout") {
    setLoading(kind);
    setError("");
    const res = await fetch(`/api/attempts/${attemptId}/${kind}`, { method: "POST" });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setError(data.error || "Failed to submit");
      return;
    }
    router.push(data.redirect || "/dashboard");
    router.refresh();
  }

  return (
    <div className="mt-6 space-y-3">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <button
        onClick={() => finish("complete")}
        disabled={disabled || loading !== null}
        className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {disabled
          ? "Already submitted"
          : loading === "complete"
            ? "Submitting..."
            : "Submit survey & claim coins"}
      </button>
      <button
        onClick={() => finish("screenout")}
        disabled={disabled || loading !== null}
        className="w-full rounded-lg border border-stone-300 py-2 text-sm font-medium text-stone-500 hover:bg-stone-50 disabled:opacity-50"
      >
        {loading === "screenout" ? "Submitting..." : "Simulate screenout (demo)"}
      </button>
    </div>
  );
}
