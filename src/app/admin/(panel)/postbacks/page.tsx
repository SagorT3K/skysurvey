import { CircleCheckBig, Radio, ShieldAlert, TriangleAlert, Undo2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { listProviders } from "@/lib/providers";

export const dynamic = "force-dynamic";

const OUTCOME_STYLE: Record<string, { cls: string; label: string }> = {
  credited: { cls: "bg-emerald-100 text-emerald-700", label: "credited" },
  reversed: { cls: "bg-red-100 text-red-600", label: "reversed" },
  duplicate: { cls: "bg-slate-100 text-slate-600", label: "duplicate" },
  bad_signature: { cls: "bg-red-100 text-red-700", label: "bad signature" },
  unknown_tx: { cls: "bg-amber-100 text-amber-700", label: "unknown tx" },
  unknown_provider: { cls: "bg-amber-100 text-amber-700", label: "unknown provider" },
  invalid: { cls: "bg-amber-100 text-amber-700", label: "invalid" },
};

export default async function AdminPostbacksPage() {
  const providers = listProviders();
  const [logs, counts] = await Promise.all([
    prisma.postbackLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.postbackLog.groupBy({ by: ["outcome"], _count: { _all: true } }),
  ]);

  const rejected = counts
    .filter((c) => c.outcome === "bad_signature" || c.outcome === "unknown_tx")
    .reduce((sum, c) => sum + c._count._all, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Router postbacks</h1>
      <p className="mt-1 text-sm text-slate-500">
        Every server-to-server callback a survey router sent us. Nothing here is deleted — this is
        the evidence trail if a partner disputes a payout.
      </p>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 font-bold text-slate-900">
          <Radio size={17} className="text-slate-500" aria-hidden="true" />
          Configured providers
        </h2>
        {providers.length === 0 ? (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            No live router configured. Set PROVIDERS and the matching PROVIDER_*_* variables in
            .env, then restart — until then only the built-in demo surveys work.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {providers.map((p) => (
              <div
                key={p.key}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-slate-900">{p.label}</p>
                  <p className="text-xs text-slate-500">
                    publisher {p.publisherId || "not set"} · signature {p.signatureMode} · payout in{" "}
                    {p.payoutUnit}
                    {p.ipAllowlist.length > 0 && ` · ${p.ipAllowlist.length} allowlisted IP(s)`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {p.signatureMode === "none" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                      <ShieldAlert size={12} aria-hidden="true" />
                      unsigned
                    </span>
                  )}
                  <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
                    /api/postback/{p.key}
                  </code>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { icon: CircleCheckBig, label: "Credited", value: counts.find((c) => c.outcome === "credited")?._count._all ?? 0 },
          { icon: Undo2, label: "Reversed", value: counts.find((c) => c.outcome === "reversed")?._count._all ?? 0 },
          { icon: ShieldAlert, label: "Rejected", value: rejected },
        ].map(({ icon: Icon, ...c }) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Icon size={14} aria-hidden="true" />
              {c.label}
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">When</th>
              <th className="px-4 py-2.5">Provider</th>
              <th className="px-4 py-2.5">Outcome</th>
              <th className="px-4 py-2.5">Transaction</th>
              <th className="px-4 py-2.5 text-right">Payout</th>
              <th className="px-4 py-2.5 text-right">Coins</th>
              <th className="px-4 py-2.5">Source IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => {
              const style = OUTCOME_STYLE[l.outcome] ?? { cls: "bg-slate-100 text-slate-600", label: l.outcome };
              return (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">{l.provider}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.cls}`}>
                      {style.label}
                    </span>
                    {l.note && <span className="ml-2 text-xs text-slate-400">{l.note}</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <code className="text-xs text-slate-500">{l.txId || "—"}</code>
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">
                    {l.payoutCents ? `$${(l.payoutCents / 100).toFixed(2)}` : "—"}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-semibold ${l.coins < 0 ? "text-red-600" : "text-slate-700"}`}>
                    {l.coins || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-400">{l.ip}</td>
                </tr>
              );
            })}
            {logs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  No postbacks received yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
