import { prisma } from "./prisma";
import { effectiveSharePercent, addScore } from "./score";

export type WalletSummary = {
  balance: number;
  withdrawable: number;
  pending: number;
};

export async function getWalletSummary(userId: number): Promise<WalletSummary> {
  // No hold window anymore: everything on the balance is withdrawable. Risk is
  // managed by the admin reviewing each redeem request before releasing payment.
  const agg = await prisma.coinTransaction.aggregate({ where: { userId }, _sum: { coins: true } });
  const balance = agg._sum.coins ?? 0;
  const withdrawable = Math.max(0, balance);
  return { balance, withdrawable, pending: 0 };
}

export function coinsForPayout(payoutCents: number, rewardSharePercent: number, coinRateCents: number) {
  return Math.max(0, Math.floor((payoutCents * rewardSharePercent) / 100 / coinRateCents));
}
/**
 * Settles a survey attempt: marks it completed and credits the user's share of the
 * router payout, held until the reversal window closes.
 *
 * Idempotent — routers retry postbacks, so a non-"started" attempt reports
 * `duplicate` and leaves the ledger untouched.
 */
export async function completeAttempt(opts: {
  attemptId: number;
  payoutCents?: number;
  rewardSharePercent: number;
  coinRateCents: number;
  source: string;
}): Promise<{ ok: boolean; duplicate: boolean; coins: number; payoutCents: number }> {
  const attempt = await prisma.surveyAttempt.findUnique({ where: { id: opts.attemptId } });
  if (!attempt) return { ok: false, duplicate: false, coins: 0, payoutCents: 0 };
  if (attempt.status !== "started") {
    return { ok: false, duplicate: true, coins: attempt.coinsCredited, payoutCents: attempt.cpiCents };
  }

  const payoutCents = opts.payoutCents && opts.payoutCents > 0 ? opts.payoutCents : attempt.cpiCents;
  // Higher trust level = a bigger slice of the router payout.
  const attempter = await prisma.user.findUnique({
    where: { id: attempt.userId },
    select: { score: true },
  });
  const share = effectiveSharePercent(opts.rewardSharePercent, attempter?.score ?? 0);
  const coins = coinsForPayout(payoutCents, share, opts.coinRateCents);

  await prisma.$transaction([
    prisma.surveyAttempt.update({
      where: { id: attempt.id },
      data: { status: "completed", completedAt: new Date(), coinsCredited: coins, cpiCents: payoutCents },
    }),
    prisma.coinTransaction.create({
      data: {
        userId: attempt.userId,
        type: "survey",
        category: "survey",
        coins,
        description: `Survey #${attempt.surveyId} · ${opts.source}`,
        // No hold window: coins are withdrawable immediately. Payout risk is
        // handled by the admin reviewing each redeem request before release.
      },
    }),
  ]);

  // Trust score: +1 per completed survey.
  await addScore({
    userId: attempt.userId,
    delta: 1,
    reason: "survey_complete",
    detail: `Survey #${attempt.surveyId} · ${opts.source}`,
  });

  return { ok: true, duplicate: false, coins, payoutCents };
}
export async function creditCoins(opts: {
  userId: number;
  type: string;
  coins: number;
  description?: string;
  category?: string;
  holdDays?: number;
}) {
  const availableAt = opts.holdDays
    ? new Date(Date.now() + opts.holdDays * 24 * 60 * 60 * 1000)
    : new Date();
  return prisma.coinTransaction.create({
    data: {
      userId: opts.userId,
      type: opts.type,
      category: opts.category ?? "",
      coins: opts.coins,
      description: opts.description ?? "",
      availableAt,
    },
  });
}

/**
 * Claws back a completed attempt after the router rejected the response.
 *
 * The debit is the exact number of coins that were credited, and it is allowed to
 * push the balance negative: the router has already taken the money back from us,
 * so if the user cashed out first the shortfall has to sit on their account until
 * they earn it back. Idempotent — a repeated reversal postback is a no-op.
 */
export async function reverseAttempt(opts: {
  attemptId: number;
  source: string;
  note?: string;
}): Promise<{ ok: boolean; duplicate: boolean; coins: number }> {
  const attempt = await prisma.surveyAttempt.findUnique({ where: { id: opts.attemptId } });
  if (!attempt) return { ok: false, duplicate: false, coins: 0 };
  if (attempt.status === "reversed") return { ok: false, duplicate: true, coins: attempt.coinsCredited };
  if (attempt.status !== "completed") return { ok: false, duplicate: false, coins: 0 };

  const coins = attempt.coinsCredited;

  await prisma.$transaction([
    prisma.surveyAttempt.update({
      where: { id: attempt.id },
      data: { status: "reversed", reversedAt: new Date() },
    }),
    prisma.coinTransaction.create({
      data: {
        userId: attempt.userId,
        type: "reversal",
        category: "reconciliation",
        coins: -coins,
        description: opts.note || `Survey #${attempt.surveyId} rejected by partner · ${opts.source}`,
      },
    }),
    prisma.activityLog.create({
      data: {
        userId: attempt.userId,
        event: "survey_reversal",
        detail: `attempt=${attempt.id} survey=${attempt.surveyId} coins=-${coins} source=${opts.source}`,
      },
    }),
  ]);

  // Router clawed the response back — that is bad performance, −10 trust score.
  await addScore({
    userId: attempt.userId,
    delta: -10,
    reason: "reversal",
    detail: `Survey #${attempt.surveyId} rejected by partner · ${opts.source}`,
  });

  return { ok: true, duplicate: false, coins };
}
