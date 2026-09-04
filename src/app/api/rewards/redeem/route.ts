import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, clientIp, userAgent, isHeld, holdDurationLeft } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { getWalletSummary, creditCoins } from "@/lib/ledger";
import { REDEEM_METHOD_IDS, REDEEM_AMOUNT_CENTS } from "@/lib/redeem";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Held accounts are read-only: no earning and no redemption until the hold ends.
  if (isHeld(user)) {
    return NextResponse.json(
      { error: `Sorry, you can't redeem right now. Your account has been held for ${holdDurationLeft(user)}.` },
      { status: 403 },
    );
  }

  // Flagged accounts keep earning but cannot withdraw until an admin clears the
  // review, because a payout we send is unrecoverable if the router claws it back.
  if (user.isFlagged) {
    return NextResponse.json(
      { error: "Your account is under review. Contact support before requesting a payout." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const amountCents = Number(body?.amountCents);
  const method = String(body?.method || "").trim();
  const rawDestination = String(body?.destination || "").trim();

  if (!REDEEM_AMOUNT_CENTS.includes(amountCents as (typeof REDEEM_AMOUNT_CENTS)[number])) {
    return NextResponse.json({ error: "Choose a $5, $10 or $15 payout" }, { status: 400 });
  }
  if (!REDEEM_METHOD_IDS.has(method)) {
    return NextResponse.json({ error: "Choose a payout method" }, { status: 400 });
  }

  const config = await getConfig();
  const coins = amountCents / config.coin_rate_cents;
  if (!Number.isInteger(coins) || coins < config.min_cashout_coins) {
    return NextResponse.json(
      { error: `Minimum cashout is ${config.min_cashout_coins} coins` },
      { status: 400 },
    );
  }

  // PayPal pays to the email the user provides; gift card codes go to the email on
  // the account; crypto pays to the wallet address the user entered.
  let destination: string;
  if (method === "paypal") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawDestination)) {
      return NextResponse.json({ error: "A valid PayPal email is required" }, { status: 400 });
    }
    destination = rawDestination;
  } else if (method.startsWith("giftcard_")) {
    destination = user.paypalEmail || user.email;
  } else {
    if (rawDestination.length < 20) {
      return NextResponse.json({ error: "Enter a valid wallet address" }, { status: 400 });
    }
    destination = rawDestination;
  }

  const wallet = await getWalletSummary(user.id);
  if (coins > wallet.withdrawable) {
    return NextResponse.json(
      { error: `You only have ${wallet.withdrawable} withdrawable coins (rest are on hold)` },
      { status: 400 },
    );
  }

  // Per-user serial for display: the user's 1st request is #1 regardless of how
  // many requests other users have made.
  const seq = (await prisma.redeemRequest.count({ where: { userId: user.id } })) + 1;

  const redeem = await prisma.redeemRequest.create({
    data: { userId: user.id, coins, amountCents, destination, method },
  });

  // Deduct immediately so the same coins cannot be redeemed twice.
  await creditCoins({
    userId: user.id,
    type: "redeem",
    coins: -coins,
    description: `Redeem request #${seq}`,
  });

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      event: "redeem_request",
      detail: `redeem=${redeem.id} seq=${seq} method=${method} coins=${coins} to=${destination}`,
      ip: clientIp(req),
      userAgent: userAgent(req),
    },
  });

  return NextResponse.json({ ok: true, redeemId: redeem.id, seq });
}
