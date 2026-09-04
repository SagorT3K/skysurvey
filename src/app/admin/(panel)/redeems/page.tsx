import { ArrowRight } from "lucide-react";
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

  const badge: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-sky-100 text-sky-700",
    paid: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-600",
  };
  const statusLabel: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    paid: "Success",
    rejected: "Rejected",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Redeem requests</h1>
      <p className="mt-1 text-sm text-slate-500">
        Verify the request, send the payment (PayPal / gift card / crypto), then Release it — the
        user sees it as Success with the release time. Rejected requests refund the coins
        automatically.
      </p>

      <div className="mt-5 space-y-3">
        {redeems.map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5"
          >
            <div>
              <p className="flex items-center gap-2 font-semibold text-slate-900">
                #{r.id} · {r.coins.toLocaleString()} coins
                <ArrowRight size={15} className="text-slate-400" aria-hidden="true" />$
                {(r.amountCents / 100).toFixed(2)}
              </p>
              <p className="mt-0.5 text-sm text-slate-500">
                <a href={`/admin/users/${r.userId}`} className="text-sky-600 hover:underline">
                  {r.user.email}
                </a>{" "}
                · {methodLabel(r.method)} → {r.destination} · {new Date(r.createdAt).toLocaleString()}
              </p>
              {r.adminNote && <p className="mt-0.5 text-xs text-slate-400">Note: {r.adminNote}</p>}
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge[r.status]}`}>
                {statusLabel[r.status] ?? r.status}
              </span>
              <RedeemActions redeemId={r.id} status={r.status} />
            </div>
          </div>
        ))}
        {redeems.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            No redeem requests yet.
          </div>
        )}
      </div>
    </div>
  );
}
