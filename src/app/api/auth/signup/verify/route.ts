import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken, setSessionCookie, clientIp, userAgent } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { creditCoins } from "@/lib/ledger";
import { notify } from "@/lib/notify";
import { codeMatches } from "@/lib/signup-verify";

const MAX_VERIFY_ATTEMPTS = 5;

/**
 * Step 2 of signup: confirm the emailed 6-digit code and create the account.
 * Wrong guesses are counted and capped so the code cannot be brute-forced;
 * after too many misses the user must request a fresh code.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  const code = String(body?.code || "").trim();

  if (!email || !code) {
    return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Enter the 6-digit code from the email" }, { status: 400 });
  }

  const pending = await prisma.pendingSignup.findUnique({ where: { email } });
  if (!pending) {
    return NextResponse.json(
      { error: "No pending signup for this email. Start again to get a code." },
      { status: 400 },
    );
  }
  if (pending.expiresAt.getTime() < Date.now()) {
    await prisma.pendingSignup.delete({ where: { email } }).catch(() => null);
    return NextResponse.json(
      { error: "The code expired. Request a new one." },
      { status: 410 },
    );
  }
  if (pending.attempts >= MAX_VERIFY_ATTEMPTS) {
    return NextResponse.json(
      { error: "Too many wrong attempts. Request a new code." },
      { status: 429 },
    );
  }
  if (!codeMatches(email, code, pending.codeHash)) {
    await prisma.pendingSignup.update({
      where: { email },
      data: { attempts: { increment: 1 } },
    });
    const left = MAX_VERIFY_ATTEMPTS - (pending.attempts + 1);
    return NextResponse.json(
      { error: left > 0 ? `Incorrect code. ${left} attempt(s) left.` : "Incorrect code." },
      { status: 400 },
    );
  }

  if (await prisma.user.findUnique({ where: { email } })) {
    await prisma.pendingSignup.delete({ where: { email } }).catch(() => null);
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 },
    );
  }

  const config = await getConfig();
  const ip = clientIp(req);

  let referrer: { id: number } | null = null;
  if (pending.referralCode) {
    referrer = await prisma.user.findUnique({
      where: { referralCode: pending.referralCode },
    });
  }

  // Signups from an IP that already hosts several accounts are the single
  // strongest fraud signal routers act on, so record it — but only flag when an
  // admin asked for a cap. max_accounts_per_ip = 0 (the default) is unlimited,
  // because families and mobile users legitimately share one connection.
  const sameIpCount =
    ip && ip !== "local" ? await prisma.user.count({ where: { signupIp: ip } }) : 0;
  const selfReferral = referrer?.id !== undefined && sameIpCount > 0;
  const overIpCap = config.max_accounts_per_ip > 0 && sameIpCount >= config.max_accounts_per_ip;

  // Every account gets a unique, searchable username — derived from the chosen
  // display name or the email prefix, with a numeric suffix when taken.
  const base =
    String(pending.username || email.split("@")[0])
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "")
      .replace(/^[-._]+/, "")
      .slice(0, 28) || "user";
  let username = base;
  let suffix = 2;
  while (await prisma.user.findFirst({ where: { username } })) {
    username = `${base}-${suffix++}`;
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: pending.passwordHash,
      username,
      country: pending.country,
      referredById: referrer?.id,
      signupIp: ip,
      isFlagged: overIpCap,
      flagReason: overIpCap ? `${sameIpCount} existing account(s) share signup IP ${ip}` : "",
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.pendingSignup.delete({ where: { email } }).catch(() => null);

  if (config.signup_bonus_coins > 0) {
    await creditCoins({
      userId: user.id,
      type: "bonus",
      coins: config.signup_bonus_coins,
      description: "Signup bonus",
    });
  }
  // A referral bonus is only paid when the invite came from a different connection —
  // otherwise the referral programme just pays people to make second accounts.
  if (referrer && config.referral_bonus_coins > 0 && !selfReferral) {
    await creditCoins({
      userId: referrer.id,
      type: "referral",
      coins: config.referral_bonus_coins,
      description: `Referral bonus for inviting ${email}`,
    });
    await notify({
      userId: referrer.id,
      type: "referral",
      title: "A friend joined with your link! 🎉",
      body: `${username} signed up using your referral — coins are on the way.`,
    });
  }

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      event: "signup",
      detail: `country=${user.country} sameIp=${sameIpCount}${selfReferral ? " self_referral_suppressed" : ""} verified_email=1`,
      ip,
      userAgent: userAgent(req),
    },
  });

  await setSessionCookie(signToken({ uid: user.id, role: user.role }));
  return NextResponse.json({ ok: true, role: user.role });
}
