import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { clientIp, userAgent } from "@/lib/auth";
import { verifyCaptcha, captchaError } from "@/lib/captcha";
import { sendMail } from "@/lib/mailer";
import {
  newCode,
  hashCode,
  domainAcceptsMail,
  verificationEmail,
} from "@/lib/signup-verify";

export const CODE_TTL_MINUTES = 15;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_SENDS_PER_HOUR = 5;

/**
 * Step 1 of signup: validate the details + captcha, then email a 6-digit
 * code. No user row is created here — the account only exists after the
 * code is confirmed at /api/auth/signup/verify, so fake addresses can
 * never create accounts.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const country = String(body?.country || "").trim();
  const usernameRaw = String(body?.username || "").trim();
  const ref = String(body?.ref || "").trim();
  const captchaToken = String(body?.captchaToken || body?.captcha_token || "");

  if (!email || !password || !country) {
    return NextResponse.json(
      { error: "Email, password and country are required" },
      { status: 400 },
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 },
    );
  }

  const ip = clientIp(req);
  const captcha = await verifyCaptcha(captchaToken, ip);
  if (!captcha.ok) {
    return NextResponse.json({ error: captchaError(captcha.reason) }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 },
    );
  }

  if (!(await domainAcceptsMail(email))) {
    return NextResponse.json(
      { error: "This email address does not look deliverable. Please use a real inbox." },
      { status: 400 },
    );
  }

  const now = new Date();
  const pending = await prisma.pendingSignup.findUnique({ where: { email } });
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
        { error: "Too many codes sent. Try again in an hour.", step: "code" },
        { status: 429 },
      );
    }
  }

  const code = newCode();
  const expiresAt = new Date(now.getTime() + CODE_TTL_MINUTES * 60 * 1000);
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.pendingSignup.upsert({
    where: { email },
    update: {
      username: usernameRaw,
      passwordHash,
      country,
      referralCode: ref,
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
      username: usernameRaw,
      passwordHash,
      country,
      referralCode: ref,
      codeHash: hashCode(email, code),
      sends: 1,
      lastSentAt: now,
      expiresAt,
      ip,
      userAgent: userAgent(req),
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
      {
        error:
          sent.reason === "not-configured"
            ? "Email service is not configured. Please contact support."
            : "Could not send the verification email. Try again in a minute.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, step: "code", expiresInMinutes: CODE_TTL_MINUTES });
}
