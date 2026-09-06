import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

/**
 * Polling endpoint for the survey-taking UX: the dashboard opens the router
 * survey in a new tab and checks here until the provider's postback flips the
 * attempt to completed / screenout / reversed, then shows the result card.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ txId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { txId } = await params;
  const attempt = await prisma.surveyAttempt.findFirst({
    where: { txId, userId: user.id },
    select: { status: true, coinsCredited: true, cpiCents: true },
  });
  if (!attempt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    status: attempt.status, // started | completed | reversed | screenout
    coins: attempt.coinsCredited,
    payoutCents: attempt.cpiCents,
  });
}
