import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientIp } from "@/lib/auth";
import { verifyCaptcha, captchaError } from "@/lib/captcha";
import { sendMail } from "@/lib/mailer";
import { newCode, hashCode, verificationEmail } from "@/lib/signup-verify";
import { CODE_TTL_MINUTES } from "../route";

const RESEND_COOLDOWN_SECONDS = 60;
const MAX_SENDS_PER_HOUR = 5;

/** Re-send the signup code. Captcha is required so one inbox can't be spammed. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  const captchaToken = String(body?.captchaToken || body?.captcha_token || "");

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email address is required" }, { status: 400 });
  }

  const ip = clientIp(req);
  const captcha = await verifyCaptcha(captchaToken, ip);
  if (!captcha.ok) {
    return NextResponse.json({ error: captchaError(captcha.reason) }, { status: 400 });
  }

  const pending = await prisma.pendingSignup.findUnique({ where: { email } });
  if (!pending) {
    return NextResponse.json(
      { error: "No pending signup for this email. Start again." },
      { status: 404 },
    );
  }

  const now = new Date();
  const sinceLastSend = (now.getTime() - pending.lastSentAt.getTime()) / 1000;
  if (sinceLastSend < RESEND_COOLDOWN_SECONDS) {
    return NextResponse.json(
      { error: `Wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - sinceLastSend)}s before resending.` },
      { status: 429 },
    );
  }
  const withinHour = now.getTime() - pending.createdAt.getTime() < 60 * 60 * 1000;
  if (withinHour && pending.sends >= MAX_SENDS_PER_HOUR) {
    return NextResponse.json(
      { error: "Too many codes sent. Try again in an hour." },
      { status: 429 },
    );
  }

  const code = newCode();
  await prisma.pendingSignup.update({
    where: { email },
    data: {
      codeHash: hashCode(email, code),
      attempts: 0,
      sends: { increment: 1 },
      lastSentAt: now,
      expiresAt: new Date(now.getTime() + CODE_TTL_MINUTES * 60 * 1000),
    },
  });

  const { text, html } = verificationEmail(code, CODE_TTL_MINUTES);
  const sent = await sendMail({
    to: email,
    subject: `Your SkySurvey code is ${code}`,
    text,
    html,
  });
  if (!sent.ok) {
    return NextResponse.json(
      { error: "Could not send the email. Try again in a minute." },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true, expiresInMinutes: CODE_TTL_MINUTES });
}
