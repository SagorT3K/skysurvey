import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, clientIp, userAgent } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { getWalletSummary, creditCoins } from "@/lib/ledger";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Flagged accounts keep earning but cannot withdraw until an admin clears the
  // review, because a payout we send is unrecoverable if the router claws it back.
  if (user.isFlagged) {
    return NextResponse.json(
      { error: "Your account is under review. Contact support before requesting a payout." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const coins = Number(body?.coins);
  const destination = String(body?.destination || "").trim();
  if (!coins || coins <= 0 || !destination) {
    return NextResponse.json({ error: "Coin amount and payout email are required" }, { status: 400 });
  }

  const config = await getConfig();
  if (coins < config.min_cashout_coins) {
    return NextResponse.json(
      { error: `Minimum cashout is ${config.min_cashout_coins} coins` },
      { status: 400 },
    );
  }

  const wallet = await getWalletSummary(user.id);
  if (coins > wallet.withdrawable) {
    return NextResponse.json(
      { error: `You only have ${wallet.withdrawable} withdrawable coins (rest are on hold)` },
      { status: 400 },
    );
  }

  const amountCents = coins * config.coin_rate_cents;

  const redeem = await prisma.redeemRequest.create({
    data: { userId: user.id, coins, amountCents, destination, method: "paypal" },
  });

  // Deduct immediately so the same coins cannot be redeemed twice.
  await creditCoins({
    userId: user.id,
    type: "redeem",
    coins: -coins,
    description: `Redeem request #${redeem.id}`,
  });

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      event: "redeem_request",
      detail: `redeem=${redeem.id} coins=${coins} to=${destination}`,
      ip: clientIp(req),
      userAgent: userAgent(req),
    },
  });

  return NextResponse.json({ ok: true, redeemId: redeem.id });
}
