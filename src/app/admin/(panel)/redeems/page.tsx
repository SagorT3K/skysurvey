import Link from "next/link";
import { Globe2, Mail, UserRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { methodLabel } from "@/lib/redeem";
import { levelFromScore } from "@/lib/score";
import RedeemActions from "@/components/admin/RedeemActions";

export const dynamic = "force-dynamic";

type RedeemRow = {
  id: number;
  userId: number;
  coins: number;
  amountCents: number;
  method: string;
  destination: string;
  status: string;
  adminNote: string;
  createdAt: Date;
  processedAt: Date | null;
  user: { username: string; email: string; country: string; score: number };
};

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending review", cls: "bg-amber-100 text-amber-700 ring-amber-200" },
  approved: { label: "Approved", cls: "bg-sky-100 text-sky-700 ring-sky-200" },
  paid: { label: "Success", cls: "bg-emerald-100 text-emerald-700 ring-emerald-200" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-600 ring-red-200" },
};

function RedeemCard({ r, seq, actions }: { r: RedeemRow; seq: number; actions?: React.ReactNode }) {
  const status = STATUS[r.status] ?? STATUS.pending;
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Card header: who, how much, status */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-600">
            #{seq}
          </span>
          <div>
            <a
              href={`/admin/users/${r.userId}`}
              className="flex items-center gap-1.5 font-semibold text-slate-900 hover:text-sky-700 hover:underline"
            >
              <UserRound size={14} className="text-slate-400" aria-hidden="true" />
              {r.user.username || r.user.email}
              <span
                className="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600"
                title={`Trust score ${r.user.score} — higher level gets released first`}
              >
                Lv {levelFromScore(r.user.score)}
              </span>
            </a>
            <p className="text-xs text-slate-500">
              {r.user.email} · request id {r.id} · {new Date(r.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-slate-900">
            ${(r.amountCents / 100).toFixed(2)}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${status.cls}`}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Card body: payout details */}
      <div className="grid gap-x-8 gap-y-3 px-5 py-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Method</p>
          <p className="mt-0.5 font-semibold text-slate-800">{methodLabel(r.method)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Send to</p>
          <p className="mt-0.5 flex items-center gap-1.5 break-all font-medium text-slate-800">
            {r.method.startsWith("giftcard_") ? (
              <>
                <Mail size={13} className="shrink-0 text-slate-400" aria-hidden="true" />
                {r.destination}
              </>
            ) : (
              r.destination
            )}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Coins</p>
          <p className="mt-0.5 font-medium text-slate-800">{r.coins.toLocaleString()} coins</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">User country</p>
          <p className="mt-0.5 flex items-center gap-1.5 font-medium text-slate-800">
            <Globe2 size={13} className="text-slate-400" aria-hidden="true" />
            {r.user.country || "—"}
          </p>
        </div>
      </div>

      {/* Card footer: timeline or actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
        <p className="text-xs text-slate-500">
          {r.status === "paid" && r.processedAt && (
            <>Released {new Date(r.processedAt).toLocaleString()}</>
          )}
          {r.status === "pending" && <>Waiting for your review</>}
          {r.status === "approved" && <>Approved — release the payment</>}
          {r.adminNote && <> · Note: {r.adminNote}</>}
        </p>
        {actions}
      </div>
    </div>
  );
}

export default async function AdminRedeemsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const active = tab === "paid" ? "paid" : "pending";

  const all = await prisma.redeemRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: true },
  });

  // Per-user serial (each user's 1st request is #1), oldest first.
  const seqOf = new Map<number, number>();
  const perUser = new Map<number, number>();
  for (const r of [...all].sort((a, b) => a.id - b.id)) {
    const n = (perUser.get(r.userId) ?? 0) + 1;
    perUser.set(r.userId, n);
    seqOf.set(r.id, n);
  }

  // Pending work queue: higher trust level first, then returning requesters
  // before first-timers — newest first within each group.
  const pending = all.filter((r) => r.status === "pending" || r.status === "approved");
  const pendingSorted = [...pending].sort((a, b) => {
    const lvl = levelFromScore(b.user.score) - levelFromScore(a.user.score);
    if (lvl !== 0) return lvl;
    const ret =
      ((seqOf.get(a.id) ?? 1) > 1 ? 1 : 0) - ((seqOf.get(b.id) ?? 1) > 1 ? 1 : 0);
    if (ret !== 0) return -ret;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  const returning = pendingSorted.filter((r) => (seqOf.get(r.id) ?? 1) > 1);
  const firstTime = pendingSorted.filter((r) => (seqOf.get(r.id) ?? 1) === 1);
  const paid = all.filter((r) => r.status === "paid");
  const rejected = all.filter((r) => r.status === "rejected");

  const tabs = [
    { id: "pending", label: "Pending", count: pending.length },
    { id: "paid", label: "Paid", count: paid.length },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Redeem requests</h1>
      <p className="mt-1 text-sm text-slate-500">
        Check the details, send the payment, then release it. Rejecting refunds the coins
        automatically.
      </p>

      {/* Tabs */}
      <div className="mt-5 flex gap-2 border-b border-slate-200">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={`/admin/redeems?tab=${t.id}`}
            className={`-mb-px rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              active === t.id
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
            <span
              className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                active === t.id ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-600"
              }`}
            >
              {t.count}
            </span>
          </Link>
        ))}
      </div>

      {active === "pending" && (
        <div className="mt-5 space-y-6">
          {pending.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
              No pending requests — all caught up.
            </div>
          )}
          <p className="text-xs text-slate-400">
            Sorted by trust level (highest first) so verified members get released fastest.
          </p>
          {returning.length > 0 && (
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Returning requesters — {returning.length}
              </p>
              {returning.map((r) => (
                <RedeemCard
                  key={r.id}
                  r={r}
                  seq={seqOf.get(r.id) ?? 0}
                  actions={<RedeemActions redeemId={r.id} status={r.status} />}
                />
              ))}
            </section>
          )}
          {firstTime.length > 0 && (
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                First-time requesters — {firstTime.length}
              </p>
              {firstTime.map((r) => (
                <RedeemCard
                  key={r.id}
                  r={r}
                  seq={seqOf.get(r.id) ?? 0}
                  actions={<RedeemActions redeemId={r.id} status={r.status} />}
                />
              ))}
            </section>
          )}
        </div>
      )}

      {active === "paid" && (
        <div className="mt-5 space-y-6">
          {paid.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
              Nothing released yet.
            </div>
          )}
          <section className="space-y-3">
            {paid.map((r) => (
              <RedeemCard key={r.id} r={r} seq={seqOf.get(r.id) ?? 0} />
            ))}
          </section>
          {rejected.length > 0 && (
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Rejected — coins refunded
              </p>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
                {rejected.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5 last:border-0"
                  >
                    <span className="font-medium text-slate-700">
                      #{seqOf.get(r.id)} · {r.user.username || r.user.email} ·{" "}
                      {methodLabel(r.method)} → {r.destination}
                    </span>
                    <span className="text-xs text-slate-400">
                      Rejected{" "}
                      {r.processedAt ? new Date(r.processedAt).toLocaleString() : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
