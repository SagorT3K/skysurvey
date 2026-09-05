import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

const PAGE_SIZE = 20;

// `filter=all|unread`, cursor `before=<id>` for infinite scroll in the bell
// popup. Always returns the live unread count for the badge.
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role === "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filter = req.nextUrl.searchParams.get("filter") === "unread" ? "unread" : "all";
  const beforeParam = req.nextUrl.searchParams.get("before");
  const before = beforeParam ? Number.parseInt(beforeParam, 10) : NaN;

  const [entries, unread] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId: user.id,
        ...(filter === "unread" ? { read: false } : {}),
        ...(Number.isInteger(before) ? { id: { lt: before } } : {}),
      },
      orderBy: { id: "desc" },
      take: PAGE_SIZE,
    }),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
  ]);

  return NextResponse.json({ entries, unread });
}

// Mark all as read.
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
  return NextResponse.json({ ok: true });
}
