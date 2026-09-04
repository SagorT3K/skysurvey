import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, clientIp, userAgent, isHeld, holdDurationLeft } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { creditCoins } from "@/lib/ledger";
import { addScore } from "@/lib/score";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (isHeld(user)) {
    return NextResponse.json(
      { error: `Sorry, you can't earn right now. Your account has been held for ${holdDurationLeft(user)}.` },
      { status: 403 },
    );
  }

  const config = await getConfig();
  if (config.daily_bonus_coins <= 0) {
    return NextResponse.json({ error: "Daily check-in is currently disabled" }, { status: 400 });
  }

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await prisma.coinTransaction.findFirst({
    where: { userId: user.id, type: "bonus", category: "daily", createdAt: { gte: dayAgo } },
  });
  if (recent) {
    const nextAt = new Date(recent.createdAt.getTime() + 24 * 60 * 60 * 1000);
    return NextResponse.json(
      { error: `Already checked in — come back after ${nextAt.toLocaleTimeString()}` },
      { status: 409 },
    );
  }

  await creditCoins({
    userId: user.id,
    type: "bonus",
    category: "daily",
    coins: config.daily_bonus_coins,
    description: "Daily check-in reward",
  });

  // Trust score: +2 per check-in, +10 bonus for every full 7-day streak, and
  // −1 for each day missed since the last check-in (charged on return).
  const today = new Date();
  const last = user.lastCheckIn ? new Date(user.lastCheckIn) : null;
  const dayMs = 24 * 60 * 60 * 1000;
  const dayOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  let streak = 1;
  if (last) {
    const gapDays = Math.round((dayOf(today) - dayOf(last)) / dayMs);
    if (gapDays === 1) {
      streak = user.checkStreak + 1;
    } else if (gapDays > 1) {
      streak = 1;
      const missed = gapDays - 1;
      await addScore({
        userId: user.id,
        delta: -missed,
        reason: "missed_check_in",
        detail: `${missed} day(s) without a check-in`,
      });
    }
  }
  await addScore({ userId: user.id, delta: 2, reason: "check_in", detail: `streak ${streak}` });
  if (streak > 0 && streak % 7 === 0) {
    await addScore({
      userId: user.id,
      delta: 10,
      reason: "streak_bonus",
      detail: `${streak}-day active streak`,
    });
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { checkStreak: streak, lastCheckIn: today },
  });

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      event: "daily_checkin",
      detail: `coins=${config.daily_bonus_coins} streak=${streak}`,
      ip: clientIp(req),
      userAgent: userAgent(req),
    },
  });

  return NextResponse.json({ ok: true, coins: config.daily_bonus_coins });
}
