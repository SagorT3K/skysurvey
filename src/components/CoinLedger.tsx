"use client";

import { useCallback, useRef, useState } from "react";

type Entry = {
  id: number;
  category: string | null;
  type: string;
  description: string | null;
  coins: number;
};

const PAGE_SIZE = 25;

export default function CoinLedger({ initial }: { initial: Entry[] }) {
  const [entries, setEntries] = useState<Entry[]>(initial);
  // Cursor = id of the last loaded entry; null means no more pages.
  const [cursor, setCursor] = useState<number | null>(
    initial.length === PAGE_SIZE ? initial[initial.length - 1].id : null
  );
  const [loading, setLoading] = useState(false);
  const inflight = useRef(false);

  const loadMore = useCallback(async () => {
    if (inflight.current || cursor === null) return;
    inflight.current = true;
    setLoading(true);
    try {
      const res = await fetch(`/api/ledger?before=${cursor}`);
      const data = await res.json();
      const batch: Entry[] = data.entries ?? [];
      setEntries((prev) => [...prev, ...batch]);
      setCursor(batch.length === PAGE_SIZE ? batch[batch.length - 1].id : null);
    } catch {
      // Leave cursor as-is so the user can retry.
    } finally {
      setLoading(false);
      inflight.current = false;
    }
  }, [cursor]);

  return (
    <div className="mt-3 max-h-[26rem] overflow-y-auto glass rounded-xl">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-[#14112b] shadow-[0_1px_0_0_rgba(255,255,255,0.08)]">
          <tr className="text-xs uppercase tracking-wide text-brand-300">
            <th className="px-5 py-2.5 text-left font-semibold">Type</th>
            <th className="px-5 py-2.5 text-left font-semibold">Details</th>
            <th className="px-5 py-2.5 text-right font-semibold">Coins</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((t) => (
            <tr key={t.id} className="border-b border-white/10 last:border-0">
              <td className="px-5 py-3 capitalize text-slate-200">{t.category || t.type}</td>
              <td className="px-5 py-3 text-slate-500">{t.description || "—"}</td>
              <td className="px-5 py-3 text-right font-semibold">
                <span className={t.coins >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {t.coins >= 0 ? "+" : ""}
                  {t.coins}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {cursor !== null ? (
        <div className="p-3 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="rounded-lg border border-white/15 px-4 py-1.5 text-sm font-medium text-brand-300 hover:bg-white/5 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : (
        entries.length >= PAGE_SIZE && (
          <p className="p-3 text-center text-xs text-slate-500">End of ledger.</p>
        )
      )}
    </div>
  );
}
