import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const userId = Number(id);
  const body = await req.json().catch(() => null);

  const wantsActive = typeof body?.isActive === "boolean";
  const wantsFlag = typeof body?.isFlagged === "boolean";
  const wantsHold = typeof body?.holdHours === "number" || body?.holdHours === null;
  if (!wantsActive && !wantsFlag && !wantsHold) {
    return NextResponse.json(
      { error: "isActive, isFlagged or holdHours is required" },
      { status: 400 },
    );
  }
  if (userId === admin.id && (wantsActive || wantsHold)) {
    return NextResponse.json({ error: "You cannot block or hold your own account" }, { status: 400 });
  }

  const data: {
    isActive?: boolean;
    isFlagged?: boolean;
    flagReason?: string;
    heldUntil?: Date | null;
    holdReason?: string;
  } = {};
  if (wantsActive) data.isActive = body.isActive;
  if (wantsFlag) {
    data.isFlagged = body.isFlagged;
    data.flagReason = body.isFlagged ? String(body.flagReason || "Flagged by admin").slice(0, 240) : "";
  }
  if (wantsHold) {
    if (body.holdHours === null) {
      // Release the hold immediately.
      data.heldUntil = null;
      data.holdReason = "";
    } else {
      const hours = Number(body.holdHours);
      if (!Number.isFinite(hours) || hours <= 0 || hours > 24 * 90) {
        return NextResponse.json(
          { error: "holdHours must be between 1 and 2160 (90 days)" },
          { status: 400 },
        );
      }
      data.heldUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
      data.holdReason = String(body.holdReason || "Suspicious activity").slice(0, 240);
    }
  }

  const user = await prisma.user.update({ where: { id: userId }, data });

  const actions = [
    wantsActive ? (body.isActive ? "unblocked" : "blocked") : null,
    wantsFlag ? (body.isFlagged ? "flagged" : "cleared fraud review for") : null,
    wantsHold
      ? body.holdHours === null
        ? `released hold for`
        : `held for ${body.holdHours}h`
      : null,
  ].filter(Boolean);

  await prisma.activityLog.create({
    data: {
      userId: admin.id,
      event: "admin_action",
      detail: `${actions.join(" and ")} user ${userId} (${user.email})`,
    },
  });

  return NextResponse.json({ ok: true, heldUntil: user.heldUntil });
}
