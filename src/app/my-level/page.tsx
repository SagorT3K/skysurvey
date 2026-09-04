import { redirect } from "next/navigation";
import { TrendingDown, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isHeld, holdDurationLeft } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { getWalletSummary } from "@/lib/ledger";
import { effectiveSharePercent, levelFromScore, levelProgress } from "@/lib/score";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import LevelsExplainer from "@/components/LevelsExplainer";

export const dynamic = "force-dynamic";

const REASON_LABEL: Record<string, string> = {
  signup: "Welcome bonus",
  check_in: "Daily check-in",
  streak_bonus: "Active streak bonus",
  missed_check_in: "Missed check-in",
  survey_complete: "Survey completed",
  screenout: "Survey screenout",
  reversal: "Survey reversed by partner",
  hold: "Account hold",
  redemption: "Redeem request released",
  referral_first_redeem: "Referral — first paid redemption",
};

export default async function MyLevelPage() {
  const user = await getSessionUser();
  if (!user || user.role === "admin") redirect("/login");

  const config = await getConfig();
  const wallet = await getWalletSummary(user.id);
  const held = isHeld(user);
  const holdLeft = holdDurationLeft(user);
  const events = await prisma.scoreEvent.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const level = levelFromScore(user.score);
  const prog = levelProgress(user.score);
  const share = effectiveSharePercent(config.reward_share_percent, user.score);

  return (
    <main className="flex min-h-screen flex-1 flex-col bg-cream">
      <AppHeader active="mylevel" balance={wallet.balance} />

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {/* Level and score */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-coffee-900">My level</h1>
          <p className="mt-1 text-stone-600">
            Your trust score decides your level — and your level decides your survey rate.
          </p>
        </div>

        <div className="mt-6 rounded-3xl bg-gradient-to-r from-coffee-900 via-coffee-800 to-coffee-700 p-8 text-center text-white">
          <p className="text-sm font-medium text-coffee-200">Current level</p>
          <p className="mt-1 text-6xl font-bold">
            Lv {level}
            <span className="ml-3 align-middle text-xl font-medium text-coffee-200">
              {user.score} pts
            </span>
          </p>
          <div className="mx-auto mt-5 max-w-sm">
            <div className="flex justify-between text-xs font-medium text-coffee-200">
              <span>Level {prog.level}</span>
              <span>
                {held
                  ? "Earning paused while your account is on hold"
                  : prog.needed - prog.into === 0
                    ? ""
                    : `${prog.needed - prog.into} pts to Level ${prog.level + 1}`}
              </span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-coffee-950/40">
              <div className="h-full rounded-full bg-coffee-300" style={{ width: `${prog.pct}%` }} />
            </div>
            <p className="mt-3 text-sm text-coffee-100">
              Your survey share:{" "}
              <b className="text-white">{share}%</b>{" "}
              <span className="text-coffee-300">
                (base {config.reward_share_percent}% + {(level - 1) * 2}% level bonus)
              </span>
            </p>
          </div>
        </div>

        {/* Score activity */}
        <section className="mt-8">
          <h2 className="text-lg font-bold text-coffee-900">Score activity</h2>
          <p className="mt-1 text-sm text-stone-500">Every point you have earned or lost, and why.</p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-coffee-200 bg-white">
            {events.length === 0 ? (
              <p className="p-8 text-center text-stone-500">
                No score events yet — check in daily and complete surveys to build your score.
              </p>
            ) : (
              <ul className="text-sm">
                {events.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-3 border-b border-coffee-100 px-5 py-3 last:border-0"
                  >
                    <span>
                      <span className="font-medium capitalize text-stone-800">
                        {REASON_LABEL[e.reason] ?? e.reason.replaceAll("_", " ")}
                      </span>
                      {e.detail && <span className="block text-xs text-stone-400">{e.detail}</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          e.delta >= 0
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {e.delta >= 0 ? (
                          <TrendingUp size={12} aria-hidden="true" />
                        ) : (
                          <TrendingDown size={12} aria-hidden="true" />
                        )}
                        {e.delta >= 0 ? "+" : ""}
                        {e.delta}
                      </span>
                      <span className="w-28 text-right text-xs text-stone-400">
                        {new Date(e.createdAt).toLocaleString()}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* How levels work */}
        <section className="mt-8 rounded-2xl border border-coffee-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-coffee-900">How levels work</h2>
          <div className="mt-4">
            <LevelsExplainer score={user.score} />
          </div>
        </section>
      </div>

      <AppFooter variant="app" />
    </main>
  );
}
