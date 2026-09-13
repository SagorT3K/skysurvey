import Link from "next/link";
import { redirect } from "next/navigation";
import { Coins, Crown, Medal, Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { levelFromScore } from "@/lib/score";
import { getWalletSummary } from "@/lib/ledger";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";

export const dynamic = "force-dynamic";

const MEDAL_TONE = ["text-amber-400", "text-slate-300", "text-orange-400"];

// Leaderboard windows: today resets at midnight, week/month roll back from now.
const PERIODS = [
  { id: "all", label: "All time", since: null as Date | null },
  { id: "month", label: "Last month", since: new Date(Date.now() - 30 * 864e5) },
  { id: "week", label: "Past 7 days", since: new Date(Date.now() - 7 * 864e5) },
  {
    id: "today",
    label: "Today",
    since: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()),
  },
];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || user.role === "admin") redirect("/login");
  const { period: board = "all" } = await searchParams;
  const period = PERIODS.find((p) => p.id === board) ?? PERIODS[0];

  const wallet = await getWalletSummary(user.id);

  // Full ranking for the window, so the viewer's own rank is always exact.
  const board_ = await prisma.coinTransaction.groupBy({
    by: ["userId"],
    where: { coins: { gt: 0 }, ...(period.since ? { createdAt: { gte: period.since } } : {}) },
    _sum: { coins: true },
    orderBy: { _sum: { coins: "desc" } },
  });

  const top = board_.slice(0, 10);
  const topIds = top.map((b) => b.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: [...topIds, user.id] } },
    select: { id: true, username: true, score: true },
  });
  const nameOf = (id: number) =>
    id === user.id ? "You" : users.find((u) => u.id === id)?.username || "Member";
  const scoreOf = (id: number) => users.find((u) => u.id === id)?.score ?? 0;

  const myEntry = board_.find((b) => b.userId === user.id);
  const myRank = myEntry ? board_.indexOf(myEntry) + 1 : null;

  return (
    <main className="app-dark flex min-h-screen flex-1 flex-col">
      <AppHeader active="leaderboard" balance={wallet.balance} />

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="text-center">
          <h1 className="flex items-center justify-center gap-2 text-3xl font-bold text-white">
            <Trophy size={28} className="text-amber-400" aria-hidden="true" />
            Leaderboard
          </h1>
          <p className="mt-1 text-slate-400">
            Top earners by coins earned — {period.label.toLowerCase()}.
          </p>
        </div>

        {/* Period tabs */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {PERIODS.map((p) => (
            <Link
              key={p.id}
              href={p.id === "all" ? "/leaderboard" : `/leaderboard?period=${p.id}`}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                period.id === p.id
                  ? "bg-brand-600 text-white shadow-lg shadow-brand-900/40"
                  : "bg-white/5 text-slate-300 ring-1 ring-white/10 hover:ring-brand-400/50"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>

        <div className="glass mt-6 overflow-hidden rounded-2xl">
          {top.length === 0 && (
            <p className="p-10 text-center text-slate-400">
              No one has earned coins in this period yet — complete a survey and claim the crown!
            </p>
          )}
          {top.map((b, i) => (
            <div
              key={b.userId}
              className={`flex items-center gap-3 border-b border-white/10 px-5 py-4 last:border-0 ${
                b.userId === user.id ? "bg-brand-600/15" : ""
              }`}
            >
              <span className="flex w-8 justify-center">
                {i < 3 ? (
                  <Medal size={22} className={MEDAL_TONE[i]} aria-hidden="true" />
                ) : (
                  <span className="text-sm font-bold text-slate-400">{i + 1}</span>
                )}
              </span>
              <span className="flex-1 font-medium text-slate-200">
                {nameOf(b.userId)}
                <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-brand-200">
                  Lv {levelFromScore(scoreOf(b.userId))}
                </span>
              </span>
              <span className="flex items-center gap-1.5 font-bold text-white">
                <Coins size={15} className="text-amber-400" aria-hidden="true" />
                {(b._sum.coins ?? 0).toLocaleString()}
              </span>
            </div>
          ))}

          {/* Your own rank, pinned when you didn't make the top 10 */}
          {myRank !== null && myRank > 10 && (
            <div className="flex items-center gap-3 border-t-2 border-brand-400/40 bg-brand-600/15 px-5 py-4">
              <span className="flex w-8 justify-center text-sm font-bold text-brand-300">
                {myRank}
              </span>
              <span className="flex-1 font-semibold text-white">
                You
                <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-brand-200">
                  Lv {levelFromScore(user.score)}
                </span>
              </span>
              <span className="flex items-center gap-1.5 font-bold text-white">
                <Coins size={15} className="text-amber-400" aria-hidden="true" />
                {(myEntry?._sum.coins ?? 0).toLocaleString()}
              </span>
            </div>
          )}
          {myRank === null && (
            <div className="flex items-center gap-3 border-t-2 border-white/10 bg-brand-600/15 px-5 py-4">
              <span className="flex-1 text-sm text-slate-400">
                You haven&apos;t earned any coins in this period yet — complete a survey to enter
                the board!
              </span>
            </div>
          )}
        </div>

        {myRank !== null && myRank <= 10 && (
          <p className="mt-4 flex items-center justify-center gap-2 text-center text-sm text-slate-300">
            <Crown size={16} className="text-amber-500" aria-hidden="true" />
            You are ranked <b>#{myRank}</b> {period.label.toLowerCase()}. Keep going!
          </p>
        )}

        <p className="mt-6 text-center text-xs text-slate-500">
          Rankings update in real time from every coin you earn — surveys, check-ins, bonuses and
          referrals all count.
        </p>
      </div>

      <AppFooter variant="app" />
    </main>
  );
}
