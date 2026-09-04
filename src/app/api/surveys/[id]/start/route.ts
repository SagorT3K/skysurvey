import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, clientIp, userAgent, isHeld, holdDurationLeft } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { assessSurveyEntry, flagUser } from "@/lib/fraud";
import { buildEntryUrl, getProvider } from "@/lib/providers";

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
  const surveyId = Number(id);
  const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
  if (!survey || !survey.isActive) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  const ip = clientIp(req);
  const ua = userAgent(req);
  const config = await getConfig();

  const risk = await assessSurveyEntry({
    userId: user.id,
    ip,
    userAgent: ua,
    maxAttemptsPerHour: config.max_attempts_per_hour,
    maxAccountsPerIp: config.max_accounts_per_ip,
  });

  if (risk.block) {
    await flagUser(user.id, `Survey entry blocked: ${risk.flags.join(", ")}`);
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        event: "survey_blocked",
        detail: `survey=${survey.id} flags=${risk.flags.join(",")}`,
        ip,
        userAgent: ua,
      },
    });
    return NextResponse.json({ error: risk.reason }, { status: 403 });
  }

  const attempt = await prisma.surveyAttempt.create({
    data: {
      userId: user.id,
      surveyId: survey.id,
      cpiCents: survey.cpiCents,
      ip,
      userAgent: ua,
      riskFlags: risk.flags.join(","),
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      event: "survey_start",
      detail: `survey=${survey.id} tx=${attempt.txId} title="${survey.title}"`,
      ip,
      userAgent: ua,
    },
  });

  // Mock surveys run on our own demo page. For a live router we hand the user its
  // entry URL carrying attempt.txId, which comes back to us in the postback.
  let redirect = `/mock-survey/${attempt.id}`;
  if (survey.provider !== "mock") {
    const provider = getProvider(survey.provider);
    if (!provider) {
      return NextResponse.json(
        { error: `Provider "${survey.provider}" is not configured on this server` },
        { status: 503 },
      );
    }
    redirect = buildEntryUrl(provider, {
      txId: attempt.txId,
      userId: user.id,
      surveyId: survey.id,
      externalId: survey.externalId,
      country: user.country,
      ip,
    });
  }

  return NextResponse.json({ ok: true, redirect, holdDays: config.hold_days });
}
