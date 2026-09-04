import { prisma } from "./prisma";

/**
 * Entry-time fraud screening.
 *
 * Routers hold back (or claw back) an entire month of revenue when a publisher
 * sends them duplicate or proxied traffic, so every survey entry is screened and
 * the signals are stored on the attempt. Everything here runs against our own
 * database; the only outbound call is the optional IP-intelligence lookup below,
 * which stays disabled until IP_INTEL_URL is set.
 */

export type RiskAssessment = {
  flags: string[];
  block: boolean;
  reason: string;
};

const BOT_UA = /(curl|wget|python-requests|httpclient|headless|phantomjs|puppeteer|selenium|scrapy|bot\b|spider)/i;

/**
 * Optional third-party proxy/VPN/datacenter lookup.
 * IP_INTEL_URL is a template such as https://vendor.example/check?ip={ip}&key=xxx
 * and IP_INTEL_FLAG_FIELD names the boolean field in the JSON response.
 * Returns null when unconfigured or unreachable — a dead vendor must never lock
 * legitimate users out of earning.
 */
async function checkIpIntel(ip: string): Promise<boolean | null> {
  const template = (process.env.IP_INTEL_URL || "").trim();
  if (!template || ip === "local") return null;

  const field = (process.env.IP_INTEL_FLAG_FIELD || "proxy").trim();
  try {
    const res = await fetch(template.replace("{ip}", encodeURIComponent(ip)), {
      signal: AbortSignal.timeout(2500),
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (data && typeof data === "object" && field in data) {
      return Boolean((data as Record<string, unknown>)[field]);
    }
    return null;
  } catch {
    return null;
  }
}

export async function assessSurveyEntry(opts: {
  userId: number;
  ip: string;
  userAgent: string;
  maxAttemptsPerHour: number;
  maxAccountsPerIp: number;
}): Promise<RiskAssessment> {
  const { userId, ip, userAgent, maxAttemptsPerHour, maxAccountsPerIp } = opts;
  const flags: string[] = [];
  let block = false;
  let reason = "";

  if (!userAgent) {
    flags.push("no_user_agent");
  } else if (BOT_UA.test(userAgent)) {
    flags.push("bot_user_agent");
    block = true;
    reason = "Automated traffic is not allowed on surveys.";
  }

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [recentAttempts, sharedIpUsers, openAttempts] = await Promise.all([
    prisma.surveyAttempt.count({ where: { userId, startedAt: { gte: hourAgo } } }),
    ip && ip !== "local"
      ? prisma.surveyAttempt
          .findMany({ where: { ip }, select: { userId: true }, distinct: ["userId"], take: 25 })
          .then((rows) => rows.map((r) => r.userId))
      : Promise.resolve([userId]),
    prisma.surveyAttempt.count({ where: { userId, status: "started", startedAt: { gte: hourAgo } } }),
  ]);

  if (recentAttempts >= maxAttemptsPerHour) {
    flags.push("attempt_velocity");
    block = true;
    reason = `Too many surveys started in the last hour (limit ${maxAttemptsPerHour}). Try again later.`;
  }

  const otherAccounts = sharedIpUsers.filter((id) => id !== userId).length + 1;
  if (otherAccounts > maxAccountsPerIp) {
    flags.push("shared_ip");
    block = true;
    reason = "Multiple accounts detected from this connection. Contact support to continue.";
  }

  if (openAttempts >= 5) flags.push("many_open_attempts");

  const proxy = await checkIpIntel(ip);
  if (proxy === true) {
    flags.push("proxy_ip");
    block = true;
    reason = "Surveys cannot be taken over a VPN or proxy connection.";
  }

  return { flags, block, reason };
}

/** Marks the account for manual review. Payouts stay blocked until an admin clears it. */
export async function flagUser(userId: number, reason: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { isFlagged: true, flagReason: reason.slice(0, 240) },
  });
  await prisma.activityLog.create({
    data: { userId, event: "fraud_flag", detail: reason.slice(0, 240) },
  });
}

/** Accounts sharing this signup IP, used on the admin user detail screen. */
export async function relatedAccounts(userId: number, ip: string) {
  if (!ip || ip === "local") return [];
  return prisma.user.findMany({
    where: { signupIp: ip, id: { not: userId } },
    select: { id: true, email: true, createdAt: true, isFlagged: true },
    take: 10,
  });
}


