import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { creditCoins } from "@/lib/ledger";

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

  await prisma.activityLog.create({
    data: {
      userId: admin.id,
      event: "admin_action",
      detail: `redeem #${redeem.id} ${action} (user ${redeem.userId}, ${redeem.coins} coins)`,
    },
  });

  return NextResponse.json({ ok: true, status });
}
