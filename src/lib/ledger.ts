import { prisma } from "./prisma";
import { effectiveSharePercent, addScore } from "./score";
import { notify } from "./notify";
import { partnerName } from "./providers";

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
  // Round, don't floor: routers promise users fractional coins (CPX displays
  // "1.00 Coins" for a $0.01 screenout bonus, i.e. 0.7 at our 70% share), and
  // flooring would silently pay 0 on tiny completions.
  return Math.max(0, Math.round((payoutCents * rewardSharePercent) / 100 / coinRateCents));
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

  // Users see the ledger description and the notification — they must stay
  // friendly and never mention internal plumbing like provider keys or postbacks.
  const survey = await prisma.survey.findUnique({
    where: { id: attempt.surveyId },
    select: { provider: true },
  });
  const partner = partnerName(survey?.provider ?? "");

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
        description: `Earned from ${partner}`,
        // No hold window: coins are withdrawable immediately. Payout risk is
        // handled by the admin reviewing each redeem request before release.
      },
    }),
  ]);

  // Trust score: +1 per completed survey. Internal detail — technical terms are fine here.
  await addScore({
    userId: attempt.userId,
    delta: 1,
    reason: "survey_complete",
    detail: `Survey #${attempt.surveyId} · ${opts.source}`,
  });

  if (coins > 0) {
    await notify({
      userId: attempt.userId,
      type: "survey",
      title: `Congratulations — you earned ${coins} coins! 🎉`,
      body: `You earned ${coins} coins from ${partner}. Keep going — more surveys are waiting.`,
    });
  } else {
    await notify({
      userId: attempt.userId,
      type: "survey",
      title: "Survey completed",
      body: "Your survey was validated. Bigger surveys pay more — keep going!",
    });
  }

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
        description: opts.note || "Reward reversed — the research partner rejected the response",
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

  await notify({
    userId: attempt.userId,
    type: "screenout",
    title: "A survey reward was reversed",
    body: `${coins} coins were deducted because the research partner rejected the response. Contact support if you think this is a mistake.`,
  });

  return { ok: true, duplicate: false, coins };
}
