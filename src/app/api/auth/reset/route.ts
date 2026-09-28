import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientIp, userAgent } from "@/lib/auth";
import { verifyCaptcha, captchaError } from "@/lib/captcha";
import { sendMail } from "@/lib/mailer";
import { newCode, hashCode } from "@/lib/signup-verify";
import { passwordResetEmail } from "@/lib/password-reset";

export const RESET_TTL_MINUTES = 15;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_SENDS_PER_HOUR = 5;

/**
 * Step 1 of a password reset: email a 6-digit code to the account's address.
 *
 * For an address with no account the answer is the same as for a real send —
 * `{ ok: true, step: "code" }` — so this endpoint cannot be used to ask "is this
 * person registered?". The cooldown and per-hour cap below are only reached when
 * a code was actually sent, so a 429 does imply the address exists; that matches
 * signup, which reports an existing account outright, and the alternative is
 * storing a row for every address an attacker invents.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  const captchaToken = String(body?.captchaToken || body?.captcha_token || "");

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Enter the email address on your account" },
      { status: 400 },
    );
  }

  const ip = clientIp(req);
  const captcha = await verifyCaptcha(captchaToken, ip);
  if (!captcha.ok) {
    return NextResponse.json({ error: captchaError(captcha.reason) }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ ok: true, step: "code", expiresInMinutes: RESET_TTL_MINUTES });
  }
  if (!user.isActive) {
    return NextResponse.json(
      { error: "This account has been suspended. Please contact support." },
      { status: 403 },
    );
  }

  const now = new Date();
  const pending = await prisma.passwordReset.findUnique({ where: { email } });
  if (pending) {
    const sinceLastSend = (now.getTime() - pending.lastSentAt.getTime()) / 1000;
    if (sinceLastSend < RESEND_COOLDOWN_SECONDS) {
      return NextResponse.json(
        {
          error: `A code was just sent. Wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - sinceLastSend)}s and try again.`,
          step: "code",
        },
        { status: 429 },
      );
    }
    const withinHour = now.getTime() - pending.createdAt.getTime() < 60 * 60 * 1000;
    if (withinHour && pending.sends >= MAX_SENDS_PER_HOUR) {
      return NextResponse.json(
        { error: "Too many codes requested. Try again in an hour.", step: "code" },
        { status: 429 },
      );
    }
  }

  const code = newCode();
  const expiresAt = new Date(now.getTime() + RESET_TTL_MINUTES * 60 * 1000);

  // One live code per address: a second request replaces the first rather than
  // leaving two valid codes in two different emails.
  await prisma.passwordReset.upsert({
    where: { email },
    update: {
      codeHash: hashCode(email, code),
      attempts: 0,
      sends: (pending?.sends ?? 0) + 1,
      lastSentAt: now,
      expiresAt,
      ip,
      userAgent: userAgent(req),
    },
    create: {
      email,
      codeHash: hashCode(email, code),
      sends: 1,
      lastSentAt: now,
      expiresAt,
      ip,
      userAgent: userAgent(req),
    },
  });

  const { text, html } = passwordResetEmail(code, RESET_TTL_MINUTES);
  const sent = await sendMail({
    to: email,
    subject: `Your SkySurvey password reset code is ${code}`,
    text,
    html,
  });
  if (!sent.ok) {
    return NextResponse.json(
      {
        error:
          sent.reason === "not-configured"
            ? "Email service is not configured. Please contact support."
            : "Could not send the reset email. Try again in a minute.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, step: "code", expiresInMinutes: RESET_TTL_MINUTES });
}