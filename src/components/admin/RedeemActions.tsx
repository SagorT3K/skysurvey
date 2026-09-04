"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RedeemActions({
  redeemId,
  status,
}: {
  redeemId: number;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  async function act(action: "approve" | "paid" | "reject") {
    setLoading(action);
    setError("");
    const res = await fetch(`/api/admin/redeems/${redeemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setLoading("");
    if (!res.ok) {
      setError(data.error || "Action failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      {error && <span className="text-red-600">{error}</span>}
      {status === "pending" && (
        <>
          <button
            onClick={() => act("approve")}
            disabled={!!loading}
            className="rounded-lg bg-sky-600 px-3 py-1.5 font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {loading === "approve" ? "..." : "Approve"}
          </button>
          <button
            onClick={() => act("reject")}
            disabled={!!loading}
            className="rounded-lg border border-red-300 px-3 py-1.5 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {loading === "reject" ? "..." : "Reject"}
          </button>
        </>
      )}
      {status === "approved" && (
        <button
          onClick={() => act("paid")}
          disabled={!!loading}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading === "paid" ? "..." : "Mark as paid"}
        </button>
      )}
    </div>
  );
}
