import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import {
  ArrowRight,
  CircleCheckBig,
  Coins,
  Radio,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isHeld, holdDurationLeft } from "@/lib/auth";
import { effectiveSharePercent, levelFromScore, levelProgress } from "@/lib/score";
import { getConfig } from "@/lib/config";
import { getWalletSummary } from "@/lib/ledger";
import { listProviders } from "@/lib/providers";
import { getLiveSurveys } from "@/lib/live-surveys";
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

  const share = effectiveSharePercent(config.reward_share_percent, user.score);
  const toCoins = (cpiCents: number) => Math.floor((cpiCents * share) / 100 / config.coin_rate_cents);

  // Live router inventory: every provider with a SURVEYS_URL is asked for this
  // user's targeted offers (cached ~2 min per router policy). Failures or slow
  // routers degrade silently to the DB-backed cards below.
  const liveCards: SurveyCardData[] = [];
  if (!held) {
    const hdrs = await headers();
    const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
    const ua = hdrs.get("user-agent") || "";
    const liveProviders = listProviders().filter((p) => p.surveysUrl);
    const lists = await Promise.all(
      liveProviders.map((p) => getLiveSurveys(p, { userId: user.id, ip, userAgent: ua })),
    );
    for (let i = 0; i < lists.length; i++) {
      const provider = liveProviders[i];
      for (const s of lists[i].surveys.slice(0, 8)) {
        const coins = toCoins(s.cpiCents);
        liveCards.push({
          id: `live:${provider.key}:${s.externalId}`,
          liveProvider: provider.key,
          liveId: s.externalId,
          title: `${provider.label} survey #${s.externalId}`,
          category: provider.label,
          loiMinutes: s.loiMinutes,
          coins,
          usd: (coins * config.coin_rate_cents) / 100,
          done: false,
          avgStars: s.ratingAvg,
          ratingCount: s.ratingCount,
        });
      }
    }
  }

  // When live inventory is flowing, the router's wall entry (externalId "") is
  // redundant — hide it and let the per-survey cards take the board.
  const dbSurveys = liveCards.length > 0 ? surveys.filter((s) => s.externalId !== "") : surveys;
  const dbCards: SurveyCardData[] = dbSurveys.map((s) => {
    const rating = ratingsAgg.find((r) => r.surveyId === s.id);
    const completedN = completedCounts.find((c) => s.id === c.surveyId)?._count._all ?? 0;
    const coins = toCoins(s.cpiCents);
    return {
      id: s.id,
      title: s.title,
      category: s.category,
      loiMinutes: s.loiMinutes,
      coins,
      usd: (coins * config.coin_rate_cents) / 100,
      done: false, // completed surveys are filtered out of the rotation entirely
      avgStars: rating?._avg.stars ? Math.round(rating._avg.stars * 10) / 10 : null,
      ratingCount: rating?._count._all ?? 0,
      completedCount: completedN,
    };
  });

  const cards: SurveyCardData[] = [...liveCards, ...dbCards].slice(0, 12);

  return (
    <main className="app-dark flex min-h-screen flex-1 flex-col">
      <AppHeader active="surveys" balance={wallet.balance} />

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Account hold notice */}
        {held && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-300 backdrop-blur">
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
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-700 via-brand-700 to-teal-600 p-8 text-white shadow-[0_20px_60px_rgba(105,56,239,0.35)]">
          <div className="dots-pattern pointer-events-none absolute inset-0 opacity-40" />
          <div className="animate-drift pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-fuchsia-400/30 blur-2xl" />
          <div className="animate-drift-slow pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-teal-300/20 blur-2xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-white/85">
                <Radio size={15} aria-hidden="true" />
                Live · {totalEarners.toLocaleString()} members earning
              </p>
              <h1 className="mt-1 flex items-center gap-3 text-3xl font-bold">
                Welcome back, {user.username || "friend"}
                <span
                  className="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-sm font-bold backdrop-blur"
                  title={`Trust score ${user.score}`}
                >
                  Lv {levelFromScore(user.score)}
                </span>
              </h1>
              <p className="mt-2 max-w-lg text-white/85">
                Complete surveys, keep your streak alive, and invite friends — every coin adds up to
                your next payout.
              </p>
              {/* Level progress — higher level means a bigger survey share */}
              <Link href="/my-level" className="mt-4 block max-w-xs group/prog">
                <div className="flex justify-between text-xs font-medium text-white/85">
                  <span>Level {levelProgress(user.score).level}</span>
                  <span className="underline decoration-white/50 underline-offset-2 group-hover/prog:text-white">
                    {levelProgress(user.score).needed - levelProgress(user.score).into} pts to
                    Level {levelProgress(user.score).level + 1} · my level
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-200"
                    style={{ width: `${levelProgress(user.score).pct}%` }}
                  />
                </div>
              </Link>
            </div>
            <Link
              href="/rewards"
              className="btn-shine group inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/15 px-6 py-3 font-bold text-white backdrop-blur transition hover:bg-white/25"
            >
              Redeem coins
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* Wallet cards + daily check-in */}
        <section className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            { icon: Coins, img: "/icons/coins.svg", label: "Balance", value: `${wallet.balance}`, sub: `$${((wallet.balance * config.coin_rate_cents) / 100).toFixed(2)} value`, glow: "text-brand-300" },
            { icon: Wallet, img: "/icons/wallet.svg", label: "Withdrawable", value: `${wallet.withdrawable}`, sub: wallet.withdrawable >= config.min_cashout_coins ? "Cash out now" : `${config.min_cashout_coins - wallet.withdrawable} to $5`, glow: "text-emerald-300" },
            { icon: CircleCheckBig, img: "/icons/gift.svg", label: "Redeemed", value: `${redeemedCoins}`, sub: subRequests, glow: "text-sky-300" },
          ].map(({ icon: Icon, img, ...c }) => (
            <div key={c.label} className="glass-card glass-hover relative overflow-hidden rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className={`flex items-center gap-2 text-sm font-semibold ${c.glow}`}>
                    <Icon size={15} aria-hidden="true" />
                    {c.label}
                  </p>
                  <p className="mt-1 text-3xl font-bold text-white">{c.value}</p>
                  <p className="mt-0.5 text-sm text-slate-400">{c.sub}</p>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img}
                  alt=""
                  width={56}
                  height={56}
                  className="h-14 w-14 shrink-0 drop-shadow-[0_10px_18px_rgba(0,0,0,0.45)]"
                  aria-hidden="true"
                />
              </div>
            </div>
          ))}
          <DailyCheckIn available={!lastDaily && !held} coins={config.daily_bonus_coins} />
        </section>

        {/* Surveys — hidden while the account is on hold */}
        <section className="mt-10">
          {held ? (
            <div className="glass rounded-2xl p-10 text-center text-red-300">
              Survey earning is paused while your account is on hold.
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Available surveys</h2>
                  <p className="mt-1 text-sm text-slate-400">Matched to your country ({user.country}) — coin reward shown up front.</p>
                </div>
                <span className="glass rounded-full px-3 py-1 text-xs font-semibold text-brand-200">
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

      <AppFooter variant="app" />
    </main>
  );
}
