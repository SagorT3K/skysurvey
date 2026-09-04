import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CircleCheckBig,
  Coins,
  Radio,
  ShieldAlert,
  Users,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isHeld, holdDurationLeft } from "@/lib/auth";
import { effectiveSharePercent, levelFromScore, levelProgress } from "@/lib/score";
import { getConfig } from "@/lib/config";
import { getWalletSummary } from "@/lib/ledger";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import SurveyList, { type SurveyCardData } from "@/components/SurveyList";
import DailyCheckIn from "@/components/DailyCheckIn";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user || user.role === "admin") redirect("/login");

  const config = await getConfig();
  const wallet = await getWalletSummary(user.id);

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [allSurveys, completed, lastDaily, totalEarners, redeemedAgg, totalRequestCount, pendingRequestCount, ratingsAgg, completedCounts] = await Promise.all([
    prisma.survey.findMany({
      where: { isActive: true, OR: [{ country: user.country }, { country: "ALL" }] },
    }),
    prisma.surveyAttempt.findMany({ where: { userId: user.id, status: "completed" }, select: { surveyId: true } }),
    prisma.coinTransaction.findFirst({
      where: { userId: user.id, type: "bonus", category: "daily", createdAt: { gte: dayAgo } },
    }),
    prisma.user.count({ where: { role: "user" } }),
    // Coins actually paid out so far (released requests only).
    prisma.redeemRequest.aggregate({
      where: { userId: user.id, status: "paid" },
      _sum: { coins: true },
    }),
    prisma.redeemRequest.count({ where: { userId: user.id } }),
    prisma.redeemRequest.count({ where: { userId: user.id, status: "pending" } }),
    // Community ratings shown on survey cards: average stars + how many finished it.
    prisma.surveyRating.groupBy({
      by: ["surveyId"],
      _avg: { stars: true },
      _count: { _all: true },
    }),
    prisma.surveyRating.groupBy({
      by: ["surveyId"],
      where: { outcome: "completed" },
      _count: { _all: true },
    }),
  ]);
  const redeemedCoins = redeemedAgg._sum.coins ?? 0;
  const totalRequests = totalRequestCount;
  const held = isHeld(user);
  const holdLeft = holdDurationLeft(user);
  const subRequests =
    totalRequests === 0
      ? "No requests yet"
      : pendingRequestCount > 0
        ? `${pendingRequestCount} pending`
        : `${totalRequests} released`;

  // Rotate the board: only surveys this user hasn't completed, shuffled each load
  // so every reload surfaces a fresh mix from the pool.
  const doneIds = new Set(completed.map((a) => a.surveyId));
  const fresh = allSurveys.filter((s) => !doneIds.has(s.id));
  for (let i = fresh.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [fresh[i], fresh[j]] = [fresh[j], fresh[i]];
  }
  const surveys = fresh.slice(0, 12);

  const cards: SurveyCardData[] = surveys.map((s) => {
    const rating = ratingsAgg.find((r) => r.surveyId === s.id);
    const completedN = completedCounts.find((c) => c.surveyId === s.id)?._count._all ?? 0;
    return {
      id: s.id,
      title: s.title,
      category: s.category,
      loiMinutes: s.loiMinutes,
      coins: Math.floor(
        (s.cpiCents * effectiveSharePercent(config.reward_share_percent, user.score)) /
          100 /
          config.coin_rate_cents,
      ),
      done: false, // completed surveys are filtered out of the rotation entirely
      avgStars: rating?._avg.stars ? Math.round(rating._avg.stars * 10) / 10 : null,
      ratingCount: rating?._count._all ?? 0,
      completedCount: completedN,
    };
  });

  return (
    <main className="flex min-h-screen flex-1 flex-col bg-cream">
      <AppHeader active="surveys" balance={wallet.balance} />

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Account hold notice */}
        {held && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
            <ShieldAlert size={22} className="mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-bold">Sorry, you can&apos;t earn right now.</p>
              <p className="mt-1 text-sm">
                Your account has been held for {holdLeft}. Our team reviewed activity on the account
                for policy violations such as bots, VPN or proxy usage. You can still sign in and
                view your balance; earning resumes automatically when the hold ends
                {user.holdReason ? ` (Reason: ${user.holdReason})` : ""}.
              </p>
            </div>
          </div>
        )}

        {/* Welcome banner */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-coffee-900 via-coffee-800 to-coffee-700 p-8 text-white">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-coffee-500/30 blur-2xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-coffee-200">
                <Radio size={15} aria-hidden="true" />
                Live · {totalEarners.toLocaleString()} members earning
              </p>
              <h1 className="mt-1 flex items-center gap-3 text-3xl font-bold">
                Welcome back, {user.username || "friend"}
                <span
                  className="rounded-full bg-coffee-300 px-3 py-1 text-sm font-bold text-coffee-950"
                  title={`Trust score ${user.score}`}
                >
                  Lv {levelFromScore(user.score)}
                </span>
              </h1>
              <p className="mt-2 max-w-lg text-coffee-100/85">
                Complete surveys, keep your streak alive, and invite friends — every coin adds up to
                your next payout.
              </p>
              {/* Level progress — higher level means a bigger survey share */}
              <Link href="/profile#levels" className="mt-4 block max-w-xs group/prog">
                <div className="flex justify-between text-xs font-medium text-coffee-200">
                  <span>Level {levelProgress(user.score).level}</span>
                  <span className="underline decoration-coffee-400 underline-offset-2 group-hover/prog:text-white">
                    {levelProgress(user.score).needed - levelProgress(user.score).into} pts to
                    Level {levelProgress(user.score).level + 1} · how levels work
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-coffee-950/40">
                  <div
                    className="h-full rounded-full bg-coffee-300"
                    style={{ width: `${levelProgress(user.score).pct}%` }}
                  />
                </div>
              </Link>
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

        {/* Invite friends */}
        <section className="mt-6">
          <div className="rounded-2xl border border-coffee-200 bg-white p-5">
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
        </section>

        {/* Wallet cards + daily check-in */}
        <section className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            { icon: Coins, label: "Balance", value: `${wallet.balance}`, sub: `$${((wallet.balance * config.coin_rate_cents) / 100).toFixed(2)} value`, cls: "bg-white border-coffee-200 text-coffee-900" },
            { icon: Wallet, label: "Withdrawable", value: `${wallet.withdrawable}`, sub: wallet.withdrawable >= config.min_cashout_coins ? "Cash out now" : `${config.min_cashout_coins - wallet.withdrawable} to $5`, cls: "bg-emerald-50 border-emerald-200 text-emerald-900" },
            { icon: CircleCheckBig, label: "Redeemed", value: `${redeemedCoins}`, sub: subRequests, cls: "bg-coffee-100 border-coffee-200 text-coffee-800" },
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
          <DailyCheckIn available={!lastDaily && !held} coins={config.daily_bonus_coins} />
        </section>

        {/* Surveys — hidden while the account is on hold */}
        <section className="mt-10">
          {held ? (
            <div className="rounded-2xl border border-dashed border-red-300 bg-white p-10 text-center text-red-700">
              Survey earning is paused while your account is on hold.
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-coffee-900">Available surveys</h2>
                  <p className="mt-1 text-sm text-stone-600">Matched to your country ({user.country}) — coin reward shown up front.</p>
                </div>
                <span className="rounded-full bg-coffee-100 px-3 py-1 text-xs font-semibold text-coffee-800">
                  {cards.length} new
                </span>
              </div>
              <div className="mt-5">
                <SurveyList surveys={cards} />
              </div>
            </>
          )}
        </section>

      </div>

      <AppFooter />
    </main>
  );
}
