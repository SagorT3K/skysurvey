import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, clientIp, userAgent, isHeld, holdDurationLeft } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { completeAttempt } from "@/lib/ledger";

// Completion endpoint for the built-in demo surveys only.
// Live routers settle through /api/postback/[provider] instead, which is why the
// crediting itself lives in completeAttempt() and is shared by both paths.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (isHeld(user)) {
    return NextResponse.json(
      { error: `Sorry, you can't earn right now. Your account has been held for ${holdDurationLeft(user)}.` },
      { status: 403 },
    );
  }

  const { id } = await params;
  const attempt = await prisma.surveyAttempt.findUnique({
    where: { id: Number(id) },
    include: { survey: true },
  });
  if (!attempt || attempt.userId !== user.id) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }
  if (attempt.survey.provider !== "mock") {
    return NextResponse.json(
      { error: "This survey is settled by the provider, not from the browser" },
      { status: 403 },
    );
  }
  if (attempt.status !== "started") {
    return NextResponse.json({ error: "Attempt already finished" }, { status: 409 });
  }

  const config = await getConfig();
  const result = await completeAttempt({
    attemptId: attempt.id,
    rewardSharePercent: config.reward_share_percent,
    coinRateCents: config.coin_rate_cents,
    source: "demo survey",
  });

  if (!result.ok) {
    return NextResponse.json({ error: "Attempt already finished" }, { status: 409 });
  }

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      event: "survey_complete",
      detail: `attempt=${attempt.id} survey=${attempt.surveyId} coins=${result.coins}`,
      ip: clientIp(req),
      userAgent: userAgent(req),
    },
  });

  return NextResponse.json({ ok: true, coins: result.coins });
}
