import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { startSession, clientIp, userAgent } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import { notify } from "@/lib/notify";
import { codeMatches } from "@/lib/signup-verify";
import { passwordChangedEmail } from "@/lib/password-reset";

const MAX_VERIFY_ATTEMPTS = 5;

/**
 * Step 2 of a password reset: check the emailed code, write the new password and
 * sign the user in. Wrong guesses are counted and capped so the code cannot be
 * brute-forced (six digits is a million values, and 5 guesses makes that a
 * non-starter), and the reset row is deleted on success so the code dies with it.
 *
 * Changing the password bumps `User.tokenVersion`, which retires every session
 * cookie minted before it, so other devices are signed out; the device that made
 * the change is handed a fresh token below. The "your password was changed" email
 * still goes out, so an unexpected reset is noticed rather than silently trusted.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  const code = String(body?.code || "").trim();
  const password = String(body?.password || "");

  if (!email || !code) {
    return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Enter the 6-digit code from the email" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 },
    );
  }

  const [user, reset] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.passwordReset.findUnique({ where: { email } }),
  ]);
  if (!user || !reset) {
    return NextResponse.json(
      { error: "No reset in progress for this email. Request a new code." },
      { status: 400 },
    );
  }
  if (!user.isActive) {
    return NextResponse.json(
      { error: "This account has been suspended. Please contact support." },
      { status: 403 },
    );
  }
  if (reset.expiresAt.getTime() < Date.now()) {
    await prisma.passwordReset.delete({ where: { email } }).catch(() => null);
    return NextResponse.json(
      { error: "The code expired. Request a new one." },
      { status: 410 },
    );
  }
  if (reset.attempts >= MAX_VERIFY_ATTEMPTS) {
    return NextResponse.json(
      { error: "Too many wrong attempts. Request a new code." },
      { status: 429 },
    );
  }
  if (!codeMatches(email, code, reset.codeHash)) {
    await prisma.passwordReset.update({
      where: { email },
      data: { attempts: { increment: 1 } },
    });
    const left = MAX_VERIFY_ATTEMPTS - (reset.attempts + 1);
    return NextResponse.json(
      { error: left > 0 ? `Incorrect code. ${left} attempt(s) left.` : "Incorrect code." },
      { status: 400 },
    );
  }

  const ip = clientIp(req);
  // The increment is the point of this write: it invalidates every session cookie
  // minted before now, so a session stolen with the old password dies with it.
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(password, 10),
      tokenVersion: { increment: 1 },
    },
  });
  await prisma.passwordReset.delete({ where: { email } }).catch(() => null);

  await prisma.activityLog.create({
    data: { userId: user.id, event: "password_reset", detail: "email code verified", ip, userAgent: userAgent(req) },
  });
  await notify({
    userId: user.id,
    type: "system",
    title: "Your password was changed",
    body: "If this was not you, contact support straight away.",
  });

  // Both sides of the reset sit in the user's own inbox, so best effort: a mail
  // outage must not turn a completed reset into an error screen. sendMail never
  // throws, and it logs the failure itself.
  const notice = passwordChangedEmail();
  await sendMail({
    to: email,
    subject: "Your SkySurvey password was changed",
    text: notice.text,
    html: notice.html,
  });

  // Signed in on this device only: the increment above signed every other session
  // out, so this token carries the new version.
  await startSession(updated);
  return NextResponse.json({ ok: true, role: updated.role });
}