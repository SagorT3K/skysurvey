import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, clientIp, userAgent, isHeld, holdDurationLeft } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { assessSurveyEntry, flagUser } from "@/lib/fraud";
import { buildEntryUrl, getProvider } from "@/lib/providers";
import { findLiveSurvey } from "@/lib/live-surveys";

/**
 * Starts a survey that came from a provider's per-user survey-list API.
 *
 * Unlike DB-backed surveys these don't exist in the Survey table — the router
 * inventory rotates constantly, so we store the attempt with the router's
 * external id in the txId-linked attempt row (no Survey FK row is created for
 * providers that never gave us a stable survey record). The postback pipeline
 * matches on txId exactly the same as wall entries.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (isHeld(user)) {
    return NextResponse.json(
      { error: `Sorry, you can't earn right now. Your account has been held for ${holdDurationLeft(user)}.` },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { provider?: string; externalId?: string }
    | null;
  const providerKey = (body?.provider || "").trim();
  const externalId = (body?.externalId || "").trim();
  if (!providerKey || !externalId) {
    return NextResponse.json({ error: "provider and externalId are required" }, { status: 400 });
  }

  const provider = getProvider(providerKey);
  if (!provider) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
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
        detail: `provider=${provider.key} ext=${externalId} flags=${risk.flags.join(",")}`,
        ip,
        userAgent: ua,
      },
    });
    return NextResponse.json({ error: risk.reason }, { status: 403 });
  }

  // Prefer re-verifying against the (cached) live list so only offers the
  // router actually made are startable. But the router's inventory rotates and
  // is IP-targeted — a strict 410 on a stale list would block legitimate users
  // mid-session (this exact bug made surveys unopenable). The payout is set by
  // the postback, not by the client, so proceeding with a neutral fallback is
  // safe; unknown ids just earn 0 until the provider says otherwise.
  const live = await findLiveSurvey(provider, { userId: user.id, ip, userAgent: ua, externalId });

  // The Survey table is optional for live inventory: reuse an existing row for
  // this provider+externalId (keeps ratings grouped), otherwise run without one.
  // Rows are created isActive:false — the Survey table must never render live
  // inventory as cards, or stale entries would route users to the plain wall
  // entry instead of their targeted survey.
  const survey =
    (await prisma.survey.findFirst({
      where: { provider: provider.key, externalId },
    })) ??
    (await prisma.survey.create({
      data: {
        provider: provider.key,
        externalId,
        title: `${provider.label} survey #${externalId}`,
        cpiCents: live?.cpiCents ?? 0,
        loiMinutes: live?.loiMinutes ?? 10,
        country: "ALL",
        isActive: false,
      },
    }));

  const attempt = await prisma.surveyAttempt.create({
    data: {
      userId: user.id,
      surveyId: survey.id,
      cpiCents: live?.cpiCents ?? survey.cpiCents,
      ip,
      userAgent: ua,
      riskFlags: risk.flags.join(","),
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      event: "survey_start",
      detail: `survey=${survey.id} tx=${attempt.txId} provider=${provider.key} ext=${externalId}`,
      ip,
      userAgent: ua,
    },
  });

  // Direct per-survey href, only when the router's live list actually offered
  // it. CPX hrefs carry EMPTY subid_1/subid_2 params — searchParams.set
  // replaces every occurrence, so a duplicate empty param never shadows ours.
  const entry = live ? new URL(live.href) : null;
  entry?.searchParams.set("subid_1", attempt.txId);

  // CPX's API surveys bounce the user to CPX's own wall page when they end —
  // there is no return URL to pass, so a new tab strands the user there. Their
  // script-tag integration instead embeds the wall itself in an iframe on the
  // publisher's page (no X-Frame-Options), and the wall accepts survey_id to
  // deep-open one survey. We hand back that embed URL so the client can run the
  // whole journey inside our site; subid_1 round-trips through postbacks just
  // like the plain wall flow.
  const embedUrl = /cpx-research\.com/i.test(provider.entryUrl)
    ? `${buildEntryUrl(provider, {
        txId: attempt.txId,
        userId: user.id,
        surveyId: survey.id,
        externalId,
        country: user.country,
        ip,
      })}&survey_id=${encodeURIComponent(externalId)}`
    : undefined;

  return NextResponse.json({
    ok: true,
    redirect: entry ? entry.toString() : embedUrl,
    embedUrl,
    txId: attempt.txId,
    attemptId: attempt.id,
    holdDays: config.hold_days,
  });
}
