"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, LoaderCircle, ShieldCheck, UserCheck } from "lucide-react";

export default function AdminUserActions({
  userId,
  isActive,
  isFlagged,
}: {
  userId: number;
  isActive: boolean;
  isFlagged: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"active" | "flag" | null>(null);

  async function patch(kind: "active" | "flag", body: Record<string, unknown>) {
    setPending(kind);
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setPending(null);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {isFlagged && (
        <button
          onClick={() => patch("flag", { isFlagged: false })}
          disabled={pending !== null}
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
      <button
        onClick={() => patch("active", { isActive: !isActive })}
        disabled={pending !== null}
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
  );
}
