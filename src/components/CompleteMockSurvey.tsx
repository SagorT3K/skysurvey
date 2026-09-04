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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function complete() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/attempts/${attemptId}/complete`, { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to submit");
      return;
    }
    router.push("/dashboard?completed=1");
    router.refresh();
  }

  return (
    <div className="mt-6">
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <button
        onClick={complete}
        disabled={disabled || loading}
        className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {disabled ? "Already submitted" : loading ? "Submitting..." : "Submit survey & claim coins"}
      </button>
    </div>
  );
}
