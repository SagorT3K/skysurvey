import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { creditCoins } from "@/lib/ledger";
import { addScore } from "@/lib/score";
import { notify } from "@/lib/notify";

// The admin reviews each request manually and either releases the payment
// ("paid" — shown to the user as Success) or rejects it (coins refunded).
const ACTIONS = ["paid", "reject"] as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const redeemId = Number(id);
  const body = await req.json().catch(() => null);
  const action = String(body?.action);
  const note = String(body?.note || "");
  if (!ACTIONS.includes(action as (typeof ACTIONS)[number])) {
    return NextResponse.json({ error: "action must be paid | reject" }, { status: 400 });
  }

  const redeem = await prisma.redeemRequest.findUnique({ where: { id: redeemId } });
  if (!redeem) return NextResponse.json({ error: "Redeem request not found" }, { status: 404 });

  if (redeem.status === "paid") {
    return NextResponse.json({ error: "Already released" }, { status: 409 });
  }
  if (action === "reject" && redeem.status === "rejected") {
    return NextResponse.json({ error: "Already rejected" }, { status: 409 });
  }

  const status = action === "paid" ? "paid" : "rejected";

  await prisma.redeemRequest.update({
    where: { id: redeem.id },
    data: { status, adminNote: note, processedAt: new Date() },
  });

  if (action === "reject") {
    // Give the coins back to the user's balance.
    await creditCoins({
      userId: redeem.userId,
      type: "reversal",
      category: "redeem_refund",
      coins: redeem.coins,
      description: `Redeem request #${redeem.id} rejected`,
    });
  }

  if (action === "paid") {
    // A successful redemption is proof of good standing: +5 trust score.
    await addScore({
      userId: redeem.userId,
      delta: 5,
      reason: "redemption",
      detail: `Redeem request #${redeem.id} released`,
    });

    // Payout method decides the message: voucher code, crypto transfer or PayPal cash.
    if (redeem.method.startsWith("giftcard_")) {
      await notify({
        userId: redeem.userId,
        type: "voucher",
        title: "Your gift card has arrived! 🎁",
        body: `Your $${(redeem.amountCents / 100).toFixed(2)} gift card code was sent to ${redeem.destination}.`,
      });
    } else if (redeem.method.startsWith("crypto_")) {
      await notify({
        userId: redeem.userId,
        type: "crypto",
        title: "Crypto payment sent ✅",
        body: `${(redeem.amountCents / 100).toFixed(2)} USD was sent to your wallet.`,
      });
    } else {
      await notify({
        userId: redeem.userId,
        type: "payout",
        title: "Payment sent! 💸",
        body: `$${(redeem.amountCents / 100).toFixed(2)} was sent to your PayPal (${redeem.destination}).`,
      });
    }

    // Referrer trust bonus lands only on the referred user's FIRST released
    // redemption — paying per signup would reward bot-made referrals.
    const paidCount = await prisma.redeemRequest.count({
      where: { userId: redeem.userId, status: "paid" },
    });
    if (paidCount === 1) {
      const referred = await prisma.user.findUnique({
        where: { id: redeem.userId },
        select: { referredById: true },
      });
      if (referred?.referredById) {
        await addScore({
          userId: referred.referredById,
          delta: 5,
          reason: "referral_first_redeem",
          detail: `Referred user ${redeem.userId} completed their first redemption`,
        });
        await notify({
          userId: referred.referredById,
          type: "referral",
          title: "Referral bonus earned! 🤝",
          body: "Someone you invited completed their first paid redemption — +5 trust score.",
        });
      }
    }
  }

  if (action === "reject") {
    await notify({
      userId: redeem.userId,
      type: "payout",
      title: "Redeem request rejected",
      body: `Request #${redeem.id} was rejected and your ${redeem.coins} coins were refunded.`,
    });
  }

  await prisma.activityLog.create({
    data: {
      userId: admin.id,
      event: "admin_action",
      detail: `redeem #${redeem.id} ${action} (user ${redeem.userId}, ${redeem.coins} coins)`,
    },
  });

  return NextResponse.json({ ok: true, status });
}
