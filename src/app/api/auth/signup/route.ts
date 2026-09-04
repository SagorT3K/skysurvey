import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, setSessionCookie, clientIp, userAgent } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { creditCoins } from "@/lib/ledger";
import { notify } from "@/lib/notify";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password || !body?.country) {
    return NextResponse.json({ error: "Email, password and country are required" }, { status: 400 });
  }
  const email = String(body.email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }
  if (String(body.password).length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const config = await getConfig();
  const ip = clientIp(req);

  let referrer: { id: number } | null = null;
  if (body.ref) {
    referrer = await prisma.user.findUnique({ where: { referralCode: String(body.ref) } });
  }

  // Signups from an IP that already hosts several accounts are the single
  // strongest fraud signal routers act on, so record it and flag on creation.
  const sameIpCount =
    ip && ip !== "local" ? await prisma.user.count({ where: { signupIp: ip } }) : 0;
  const selfReferral = referrer?.id !== undefined && sameIpCount > 0;

  // Every account gets a unique, searchable username — derived from the chosen
  // display name or the email prefix, with a numeric suffix when taken.
  const base =
    String(body.username || email.split("@")[0])
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
      passwordHash: await bcrypt.hash(String(body.password), 10),
      username,
      country: String(body.country),
      referredById: referrer?.id,
      signupIp: ip,
      isFlagged: sameIpCount >= config.max_accounts_per_ip,
      flagReason:
        sameIpCount >= config.max_accounts_per_ip
          ? `${sameIpCount} existing account(s) share signup IP ${ip}`
          : "",
    },
  });

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
      detail: `country=${user.country} sameIp=${sameIpCount}${selfReferral ? " self_referral_suppressed" : ""}`,
      ip,
      userAgent: userAgent(req),
    },
  });

  await setSessionCookie(signToken({ uid: user.id, role: user.role }));
  return NextResponse.json({ ok: true, role: user.role });
}
