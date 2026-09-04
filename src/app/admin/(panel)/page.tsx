import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function countSince(hoursAgo: number) {
  const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  return since;
}

export default async function AdminDashboard() {
  const dayAgo = await countSince(24);

  const [totalUsers, newUsers, attemptsToday, completesToday, completedAgg, coinsAgg, pendingRedeems, recentActivity] =
    await Promise.all([
      prisma.user.count({ where: { role: "user" } }),
      prisma.user.count({ where: { role: "user", createdAt: { gte: dayAgo } } }),
      prisma.surveyAttempt.count({ where: { startedAt: { gte: dayAgo } } }),
      prisma.surveyAttempt.count({ where: { status: "completed", completedAt: { gte: dayAgo } } }),
      prisma.surveyAttempt.aggregate({ where: { status: "completed" }, _sum: { cpiCents: true }, _count: true }),
      prisma.coinTransaction.aggregate({ where: { coins: { gt: 0 } }, _sum: { coins: true } }),
      prisma.redeemRequest.findMany({ where: { status: { in: ["pending", "approved"] } }, include: { user: true } }),
      prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 12, include: { user: true } }),
    ]);

  const revenueUsd = ((completedAgg._sum.cpiCents ?? 0) / 100).toFixed(2);
  const coinsIssued = coinsAgg._sum.coins ?? 0;
  const pendingCoins = pendingRedeems.reduce((s, r) => s + r.coins, 0);

  const cards = [
    { label: "Total users", value: totalUsers, sub: `+${newUsers} in 24h` },
    { label: "Survey starts (24h)", value: attemptsToday, sub: `${completesToday} completed` },
    { label: "Revenue (completed)", value: `$${revenueUsd}`, sub: `${completedAgg._count} completes` },
    { label: "Coins issued", value: coinsIssued.toLocaleString(), sub: `≈ $${(coinsIssued / 100).toFixed(2)} liability` },
    { label: "Pending redemptions", value: pendingRedeems.length, sub: `${pendingCoins.toLocaleString()} coins requested` },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Platform overview — last 24 hours vs lifetime.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{c.value}</p>
            <p className="text-xs text-slate-400">{c.sub}</p>
          </div>
        ))}
      </div>

      {pendingRedeems.length > 0 && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {pendingRedeems.length} redemption request(s) awaiting action —{" "}
          <Link href="/admin/redeems" className="font-semibold underline">
            review now
          </Link>
        </div>
      )}

      <h2 className="mt-8 text-lg font-bold text-slate-900">Recent user activity</h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <tbody>
            {recentActivity.map((a) => (
              <tr key={a.id} className="border-b border-slate-100 last:border-0">
                <td className="px-5 py-3 font-medium text-slate-700">{a.event}</td>
                <td className="px-5 py-3">
                  {a.user ? (
                    <Link href={`/admin/users/${a.userId}`} className="text-sky-600 hover:underline">
                      {a.user.email}
                    </Link>
                  ) : (
                    <span className="text-slate-400">system</span>
                  )}
                </td>
                <td className="px-5 py-3 text-slate-500">{a.detail}</td>
                <td className="px-5 py-3 text-slate-400">{a.ip}</td>
                <td className="px-5 py-3 text-right text-xs text-slate-400">
                  {new Date(a.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
