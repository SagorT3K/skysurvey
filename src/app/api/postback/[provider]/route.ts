import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientIp } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { completeAttempt, reverseAttempt } from "@/lib/ledger";
import { getProvider, ipAllowed, parsePostback, verifySignature } from "@/lib/providers";

/**
 * Server-to-server callback from a survey router.
 *
 * This route is deliberately unauthenticated — routers call it from their own
 * servers with no session — so the signature check IS the access control. A
 * provider with SIG_MODE=none accepts any caller who can guess a txId, so only
 * leave it off while testing locally, and prefer an IP allowlist as well.
 *
 * Every call is written to PostbackLog before we answer, accepted or not: when a
 * router disputes a payout that log is the only evidence we have.
 */

async function handle(req: Request, providerKey: string) {
  const url = new URL(req.url);
  const query = url.searchParams;

  // Routers vary between GET query strings and POST bodies; accept both.
  if (req.method === "POST") {
    const contentType = req.headers.get("content-type") || "";
    try {
      if (contentType.includes("application/json")) {
        const body = (await req.json()) as Record<string, unknown>;
        for (const [k, v] of Object.entries(body)) {
          if (!query.has(k)) query.set(k, String(v));
        }
      } else if (contentType.includes("form")) {
        const form = await req.formData();
        for (const [k, v] of form.entries()) {
          if (!query.has(k)) query.set(k, String(v));
        }
      }
    } catch {
      // Malformed body: fall through and judge on the query string alone.
    }
  }

  const ip = clientIp(req);
  const redacted = new URLSearchParams(query);
  const log = async (outcome: string, extra: Record<string, unknown> = {}) =>
    prisma.postbackLog.create({
      data: {
        provider: providerKey,
        outcome,
        ip,
        query: redacted.toString().slice(0, 2000),
        ...extra,
      },
    });

  const provider = getProvider(providerKey);
  if (!provider) {
    await log("unknown_provider");
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }

  if (!ipAllowed(provider, ip)) {
    await log("invalid", { note: `ip ${ip} not in allowlist` });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!verifySignature(provider, query)) {
    await log("bad_signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const parsed = parsePostback(provider, query);
  if (!parsed.txId) {
    await log("invalid", { note: "missing transaction id" });
    return NextResponse.json({ error: "Missing transaction id" }, { status: 400 });
  }

  const attempt = await prisma.surveyAttempt.findUnique({ where: { txId: parsed.txId } });
  if (!attempt) {
    await log("unknown_tx", { txId: parsed.txId });
    return NextResponse.json({ error: "Unknown transaction" }, { status: 404 });
  }

  const config = await getConfig();

  if (parsed.kind === "complete") {
    const result = await completeAttempt({
      attemptId: attempt.id,
      payoutCents: parsed.payoutCents,
      rewardSharePercent: config.reward_share_percent,
      coinRateCents: config.coin_rate_cents,
      source: `${provider.key} postback`,
    });
    await log(result.duplicate ? "duplicate" : "credited", {
      txId: parsed.txId,
      payoutCents: result.payoutCents,
      coins: result.coins,
    });
    return NextResponse.json({ ok: true, duplicate: result.duplicate, coins: result.coins });
  }

  if (parsed.kind === "reversal") {
    const result = await reverseAttempt({
      attemptId: attempt.id,
      source: `${provider.key} postback`,
    });
    await log(result.duplicate ? "duplicate" : "reversed", {
      txId: parsed.txId,
      coins: -result.coins,
    });
    return NextResponse.json({ ok: true, duplicate: result.duplicate, coins: -result.coins });
  }

  if (parsed.kind === "screenout") {
    if (attempt.status === "started") {
      await prisma.surveyAttempt.update({
        where: { id: attempt.id },
        data: { status: "screenout", completedAt: new Date() },
      });
    }
    await log("invalid", { txId: parsed.txId, note: `screenout (${parsed.rawStatus})` });
    return NextResponse.json({ ok: true, screenout: true });
  }

  await log("invalid", { txId: parsed.txId, note: `unmapped status "${parsed.rawStatus}"` });
  return NextResponse.json({ error: "Unrecognised status" }, { status: 400 });
}

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  return handle(req, provider);
}

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  return handle(req, provider);
}


