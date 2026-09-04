import { Globe2, Mail, UserRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { methodLabel } from "@/lib/redeem";
import RedeemActions from "@/components/admin/RedeemActions";

export const dynamic = "force-dynamic";

export default async function AdminRedeemsPage() {
  const redeems = await prisma.redeemRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: { user: true },
  });

  // Per-user serial (each user's 1st request is #1) — shown alongside the global id.
  const allIds = await prisma.redeemRequest.findMany({
    orderBy: [{ userId: "asc" }, { id: "asc" }],
    select: { id: true, userId: true },
  });
  const seqOf = new Map<number, number>();
  const perUser = new Map<number, number>();
  for (const r of allIds) {
    const n = (perUser.get(r.userId) ?? 0) + 1;
    perUser.set(r.userId, n);
    seqOf.set(r.id, n);
  }

  const STATUS: Record<string, { label: string; cls: string }> = {
    pending: { label: "Pending review", cls: "bg-amber-100 text-amber-700 ring-amber-200" },
    approved: { label: "Approved", cls: "bg-sky-100 text-sky-700 ring-sky-200" },
    paid: { label: "Success", cls: "bg-emerald-100 text-emerald-700 ring-emerald-200" },
    rejected: { label: "Rejected", cls: "bg-red-100 text-red-600 ring-red-200" },
  };

  const pendingCount = redeems.filter((r) => r.status === "pending").length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Redeem requests</h1>
          <p className="mt-1 text-sm text-slate-500">
            Check the details, send the payment, then release it. Rejecting refunds the coins
            automatically.
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="rounded-full bg-amber-100 px-4 py-1.5 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
            {pendingCount} awaiting review
          </span>
        )}
      </div>

      <div className="mt-6 space-y-4">
        {redeems.map((r) => {
          const status = STATUS[r.status] ?? STATUS.pending;
          return (
            <div
              key={r.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              {/* Card header: who, how much, status */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-600">
                    #{seqOf.get(r.id)}
                  </span>
                  <div>
                    <a
                      href={`/admin/users/${r.userId}`}
                      className="flex items-center gap-1.5 font-semibold text-slate-900 hover:text-sky-700 hover:underline"
                    >
                      <UserRound size={14} className="text-slate-400" aria-hidden="true" />
                      {r.user.username || r.user.email}
                    </a>
                    <p className="text-xs text-slate-500">
                      {r.user.email} · request id {r.id} ·{" "}
                      {new Date(r.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-slate-900">
                    ${(r.amountCents / 100).toFixed(2)}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${status.cls}`}
                  >
                    {status.label}
                  </span>
                </div>
              </div>

              {/* Card body: payout details in a definition grid */}
              <div className="grid gap-x-8 gap-y-3 px-5 py-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Method
                  </p>
                  <p className="mt-0.5 font-semibold text-slate-800">{methodLabel(r.method)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Send to
                  </p>
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
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Coins
                  </p>
                  <p className="mt-0.5 font-medium text-slate-800">
                    {r.coins.toLocaleString()} coins
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    User country
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 font-medium text-slate-800">
                    <Globe2 size={13} className="text-slate-400" aria-hidden="true" />
                    {r.user.country || "—"}
                  </p>
                </div>
              </div>

              {/* Card footer: release time or actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
                <p className="text-xs text-slate-500">
                  {r.status === "paid" && r.processedAt && (
                    <>Released {new Date(r.processedAt).toLocaleString()}</>
                  )}
                  {r.status === "rejected" && r.processedAt && (
                    <>Rejected {new Date(r.processedAt).toLocaleString()} · coins refunded</>
                  )}
                  {r.status === "pending" && <>Waiting for your review</>}
                  {r.adminNote && <> · Note: {r.adminNote}</>}
                </p>
                <RedeemActions redeemId={r.id} status={r.status} />
              </div>
            </div>
          );
        })}
        {redeems.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            No redeem requests yet.
          </div>
        )}
      </div>
    </div>
  );
}
