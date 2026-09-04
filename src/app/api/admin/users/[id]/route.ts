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
  if (!wantsActive && !wantsFlag) {
    return NextResponse.json(
      { error: "isActive or isFlagged (boolean) is required" },
      { status: 400 },
    );
  }
  if (userId === admin.id && wantsActive) {
    return NextResponse.json({ error: "You cannot block your own account" }, { status: 400 });
  }

  const data: { isActive?: boolean; isFlagged?: boolean; flagReason?: string } = {};
  if (wantsActive) data.isActive = body.isActive;
  if (wantsFlag) {
    data.isFlagged = body.isFlagged;
    data.flagReason = body.isFlagged ? String(body.flagReason || "Flagged by admin").slice(0, 240) : "";
  }

  const user = await prisma.user.update({ where: { id: userId }, data });

  const actions = [
    wantsActive ? (body.isActive ? "unblocked" : "blocked") : null,
    wantsFlag ? (body.isFlagged ? "flagged" : "cleared fraud review for") : null,
  ].filter(Boolean);

  await prisma.activityLog.create({
    data: {
      userId: admin.id,
      event: "admin_action",
      detail: `${actions.join(" and ")} user ${userId} (${user.email})`,
    },
  });

  return NextResponse.json({ ok: true });
}
