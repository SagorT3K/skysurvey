import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Coins,
  Hourglass,
  Medal,
  Radio,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { getWalletSummary } from "@/lib/ledger";
import SurveyList, { type SurveyCardData } from "@/components/SurveyList";
import LogoutButton from "@/components/LogoutButton";
import DailyCheckIn from "@/components/DailyCheckIn";
import Logo from "@/components/Logo";

const MEDAL_TONE = ["text-amber-500", "text-stone-400", "text-amber-700"];


export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user || user.role === "admin") redirect("/login");

  const config = await getConfig();
  const wallet = await getWalletSummary(user.id);

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [allSurveys, completed, recent, lastDaily, leaderboard, totalEarners] = await Promise.all([
    prisma.survey.findMany({
      where: { isActive: true, OR: [{ country: user.country }, { country: "ALL" }] },
    }),
    prisma.surveyAttempt.findMany({ where: { userId: user.id, status: "completed" }, select: { surveyId: true } }),
    prisma.coinTransaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.coinTransaction.findFirst({
      where: { userId: user.id, type: "bonus", category: "daily", createdAt: { gte: dayAgo } },
    }),
    prisma.coinTransaction.groupBy({
      by: ["userId"],
      where: { coins: { gt: 0 } },
      _sum: { coins: true },
      orderBy: { _sum: { coins: "desc" } },
      take: 5,
    }),
    prisma.user.count({ where: { role: "user" } }),
  ]);

  // Rotate the board: only surveys this user hasn't completed, shuffled each load
  // so every reload surfaces a fresh mix from the pool.
  const doneIds = new Set(completed.map((a) => a.surveyId));
  const fresh = allSurveys.filter((s) => !doneIds.has(s.id));
  for (let i = fresh.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [fresh[i], fresh[j]] = [fresh[j], fresh[i]];
  }
  const surveys = fresh.slice(0, 12);

  const topIds = leaderboard.map((l) => l.userId);
  const topUsers = await prisma.user.findMany({ where: { id: { in: topIds } }, select: { id: true, username: true } });
  const nameOf = (id: number) => topUsers.find((u) => u.id === id)?.username || "Member";
  const cards: SurveyCardData[] = surveys.map((s) => ({
    id: s.id,
    title: s.title,
    category: s.category,
    loiMinutes: s.loiMinutes,
    coins: Math.floor((s.cpiCents * config.reward_share_percent) / 100 / config.coin_rate_cents),
    done: false, // completed surveys are filtered out of the rotation entirely
  }));

  return (
    <main className="flex-1 bg-cream">
      <header className="sticky top-0 z-40 border-b border-coffee-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo href="/dashboard" size="sm" />
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/dashboard" className="rounded-lg px-3 py-1.5 font-medium text-coffee-800 hover:bg-coffee-100">
              Surveys
            </Link>
            <Link href="/rewards" className="rounded-lg px-3 py-1.5 font-medium text-stone-600 hover:bg-coffee-100">
              Rewards
            </Link>
            <span className="mx-2 hidden items-center gap-1.5 rounded-lg bg-coffee-100 px-3 py-1.5 font-semibold text-coffee-800 sm:flex">
              <Coins size={16} aria-hidden="true" />
              {wallet.balance}
            </span>
            <LogoutButton />
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Welcome banner */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-coffee-900 via-coffee-800 to-coffee-700 p-8 text-white">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-coffee-500/30 blur-2xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-coffee-200">
                <Radio size={15} aria-hidden="true" />
                Live · {totalEarners.toLocaleString()} members earning
              </p>
              <h1 className="mt-1 text-3xl font-bold">Welcome back, {user.username || "friend"}</h1>
              <p className="mt-2 max-w-lg text-coffee-100/85">
                Complete surveys, keep your streak alive, and invite friends — every coin adds up to
                your next payout.
              </p>
            </div>
            <Link
              href="/rewards"
              className="group inline-flex items-center gap-2 rounded-xl bg-coffee-300 px-6 py-3 font-bold text-coffee-950 shadow hover:bg-coffee-200"
            >
              Redeem coins
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* Wallet cards + daily check-in */}
        <section className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            { icon: Coins, label: "Balance", value: `${wallet.balance}`, sub: `$${((wallet.balance * config.coin_rate_cents) / 100).toFixed(2)} value`, cls: "bg-white border-coffee-200 text-coffee-900" },
            { icon: Wallet, label: "Withdrawable", value: `${wallet.withdrawable}`, sub: wallet.withdrawable >= config.min_cashout_coins ? "Cash out now" : `${config.min_cashout_coins - wallet.withdrawable} to $5`, cls: "bg-emerald-50 border-emerald-200 text-emerald-900" },
            { icon: Hourglass, label: "On hold (7d)", value: `${wallet.pending}`, sub: "Partner validation", cls: "bg-coffee-100 border-coffee-200 text-coffee-800" },
          ].map(({ icon: Icon, ...c }) => (
            <div key={c.label} className={`rounded-2xl border p-5 ${c.cls}`}>
              <p className="flex items-center gap-2 text-sm font-medium opacity-75">
                <Icon size={15} aria-hidden="true" />
                {c.label}
              </p>
              <p className="mt-1 text-2xl font-bold">{c.value}</p>
              <p className="text-sm opacity-70">{c.sub}</p>
            </div>
          ))}
          <DailyCheckIn available={!lastDaily} coins={config.daily_bonus_coins} />
        </section>

        {/* Surveys */}
        <section className="mt-10">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-coffee-900">Available surveys</h2>
              <p className="mt-1 text-sm text-stone-600">Matched to your country ({user.country}) — coin reward shown up front.</p>
            </div>
            <span className="rounded-full bg-coffee-100 px-3 py-1 text-xs font-semibold text-coffee-800">
              {cards.filter((c) => !c.done).length} new
            </span>
          </div>
          <div className="mt-5">
            <SurveyList surveys={cards} />
          </div>
        </section>

        {/* Leaderboard + activity */}
        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-coffee-900">
              <Trophy size={22} className="text-coffee-600" aria-hidden="true" />
              Top earners
            </h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-coffee-200 bg-white">
              {leaderboard.map((l, i) => (
                <div key={l.userId} className={`flex items-center gap-3 border-b border-coffee-100 px-5 py-3.5 last:border-0 ${l.userId === user.id ? "bg-coffee-50" : ""}`}>
                  <span className="flex w-7 justify-center">
                    {i < 3 ? (
                      <Medal size={20} className={MEDAL_TONE[i]} aria-hidden="true" />
                    ) : (
                      <span className="text-sm font-bold text-coffee-500">{i + 1}</span>
                    )}
                  </span>
                  <span className="flex-1 font-medium text-stone-700">
                    {l.userId === user.id ? "You" : nameOf(l.userId)}
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-coffee-800">
                    <Coins size={15} className="text-coffee-500" aria-hidden="true" />
                    {(l._sum.coins ?? 0).toLocaleString()}
                  </span>
                </div>
              ))}
              {leaderboard.length === 0 && <p className="p-6 text-center text-sm text-stone-500">Be the first on the board!</p>}
            </div>

            <div className="mt-4 rounded-2xl border border-coffee-200 bg-white p-5">
              <h3 className="flex items-center gap-2 font-bold text-coffee-900">
                <Users size={18} className="text-coffee-600" aria-hidden="true" />
                Invite friends
              </h3>
              <p className="mt-1 text-sm text-stone-600">
                Share your referral link and earn {config.referral_bonus_coins} coins per friend who joins.
              </p>
              <code className="mt-3 block overflow-x-auto rounded-lg bg-coffee-50 px-3 py-2 text-sm font-semibold text-coffee-800 ring-1 ring-coffee-200">
                skysurvey.com/signup?ref={user.referralCode}
              </code>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-coffee-900">Recent activity</h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-coffee-200 bg-white">
              {recent.length === 0 ? (
                <p className="p-8 text-center text-sm text-stone-500">No activity yet — complete your first survey!</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {recent.map((t) => (
                      <tr key={t.id} className="border-b border-coffee-100 last:border-0">
                        <td className="px-5 py-3 capitalize text-stone-700">{t.category || t.type}</td>
                        <td className="px-5 py-3 text-stone-500">{t.description || "—"}</td>
                        <td className="px-5 py-3 text-right font-bold">
                          <span className={t.coins >= 0 ? "text-emerald-600" : "text-red-600"}>
                            {t.coins >= 0 ? "+" : ""}
                            {t.coins}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-xs text-stone-400">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>
      </div>

      <footer className="border-t border-coffee-200 bg-white py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 text-xs text-stone-500">
          <span>© {new Date().getFullYear()} SkySurvey</span>
          <Link href="/terms" className="hover:text-coffee-700">Terms &amp; Conditions</Link>
          <Link href="/privacy" className="hover:text-coffee-700">Privacy Policy</Link>
          <Link href="/cookies" className="hover:text-coffee-700">Cookie Policy</Link>
        </div>
      </footer>
    </main>
  );
}
