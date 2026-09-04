import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, clientIp, userAgent, isHeld, holdDurationLeft } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { creditCoins } from "@/lib/ledger";

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

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      event: "daily_checkin",
      detail: `coins=${config.daily_bonus_coins}`,
      ip: clientIp(req),
      userAgent: userAgent(req),
    },
  });

  return NextResponse.json({ ok: true, coins: config.daily_bonus_coins });
}
