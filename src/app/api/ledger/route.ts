import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

// Cursor-paginated coin ledger for the logged-in user.
// `before` = id of the last entry already shown; returns the next PAGE_SIZE entries.
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role === "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const beforeParam = req.nextUrl.searchParams.get("before");
  const before = beforeParam ? Number.parseInt(beforeParam, 10) : NaN;

  const entries = await prisma.coinTransaction.findMany({
    where: { userId: user.id, ...(Number.isInteger(before) ? { id: { lt: before } } : {}) },
    orderBy: { id: "desc" },
    take: PAGE_SIZE,
  });

  return NextResponse.json({ entries });
}
