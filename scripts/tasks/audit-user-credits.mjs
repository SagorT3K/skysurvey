/**
 * Read-only support audit for "my surveys never paid me" complaints.
 *
 * Prints one account's coin ledger, every survey attempt with the matching
 * router postback row (raw query included), the activity log, notifications and
 * overall postback health, so a missing credit can be traced to either "the
 * router never called us" or "we called it a duplicate".
 *
 * Usage:
 *   CHECK_EMAIL=a@b.com node scripts/tasks/audit-user-credits.mjs            # local sqlite
 *   $env:CHECK_EMAIL="a@b.com"; node scripts/neon-run.mjs scripts/tasks/audit-user-credits.mjs   # production (Neon)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const email = (process.env.CHECK_EMAIL || "").trim().toLowerCase();
if (!email) {
  console.error("CHECK_EMAIL is required");
  process.exit(1);
}

const line = (t) => console.log(`\n=== ${t} ===`);
const fmt = (d) => (d ? d.toISOString().replace("T", " ").slice(0, 19) : "-");

const user = await prisma.user.findUnique({ where: { email } });
if (!user) {
  console.log(`NO ACCOUNT for ${email}`);
  await prisma.$disconnect();
  process.exit(0);
}

line("USER");
console.log(
  `id=${user.id} email=${user.email} username=${user.username} role=${user.role} country=${user.country}`,
);
console.log(
  `isActive=${user.isActive} isFlagged=${user.isFlagged} flagReason="${user.flagReason}" score=${user.score}`,
);
console.log(
  `heldUntil=${fmt(user.heldUntil)} signupIp=${user.signupIp} createdAt=${fmt(user.createdAt)} referredById=${user.referredById}`,
);

line("COIN LEDGER");
const txns = await prisma.coinTransaction.findMany({
  where: { userId: user.id },
  orderBy: { id: "asc" },
});
for (const t of txns) {
  console.log(
    `#${String(t.id).padStart(4)} ${fmt(t.createdAt)} ${t.type.padEnd(10)} ${String(t.coins).padStart(6)}  cat=${t.category.padEnd(14)} "${t.description}"`,
  );
}
const byType = new Map();
for (const t of txns) {
  const cur = byType.get(t.type) ?? { n: 0, coins: 0 };
  byType.set(t.type, { n: cur.n + 1, coins: cur.coins + t.coins });
}
console.log(`-- balance = ${txns.reduce((a, t) => a + t.coins, 0)} coins in ${txns.length} rows`);
for (const [type, v] of byType) console.log(`   ${type.padEnd(12)} rows=${v.n} coins=${v.coins}`);

line("SURVEY ATTEMPTS");
const attempts = await prisma.surveyAttempt.findMany({
  where: { userId: user.id },
  orderBy: { id: "asc" },
  include: { survey: { select: { provider: true, externalId: true, title: true } } },
});
const statusCount = new Map();
for (const a of attempts) statusCount.set(a.status, (statusCount.get(a.status) ?? 0) + 1);
for (const a of attempts) {
  console.log(
    `#${String(a.id).padStart(4)} ${fmt(a.startedAt)} ${String(a.status).padEnd(10)} credited=${String(a.coinsCredited).padStart(5)} cpi=${String(a.cpiCents).padStart(4)} provider=${(a.survey?.provider ?? "?").padEnd(8)} survey=${a.surveyId}`,
  );
  console.log(`       txId=${a.txId} completedAt=${fmt(a.completedAt)} flags="${a.riskFlags}" ip=${a.ip}`);
  console.log(`       title="${a.survey?.title ?? "?"}" ext=${a.survey?.externalId ?? "-"}`);
}
console.log(`-- attempts=${attempts.length} by status: ${JSON.stringify(Object.fromEntries(statusCount))}`);
console.log(`-- total coinsCredited on attempts = ${attempts.reduce((a, x) => a + x.coinsCredited, 0)}`);

line("POSTBACK LOG ROWS FOR THESE ATTEMPTS");
const txIds = attempts.map((a) => a.txId);
const logs = txIds.length
  ? await prisma.postbackLog.findMany({
      where: { OR: [{ txId: { in: txIds } }, ...txIds.map((t) => ({ query: { contains: t } }))] },
      orderBy: { id: "asc" },
    })
  : [];
for (const l of logs) {
  console.log(
    `#${String(l.id).padStart(5)} ${fmt(l.createdAt)} ${l.provider.padEnd(8)} ${l.outcome.padEnd(14)} txId=${l.txId} payout=${l.payoutCents} coins=${l.coins} ip=${l.ip}`,
  );
  if (l.note) console.log(`       note="${l.note}"`);
  console.log(`       query="${l.query}"`);
}
console.log(`-- postback rows found for this user's attempts: ${logs.length}`);

line("ACTIVITY LOG (this user)");
const activity = await prisma.activityLog.findMany({
  where: { userId: user.id },
  orderBy: { id: "asc" },
});
for (const a of activity) {
  console.log(`#${String(a.id).padStart(4)} ${fmt(a.createdAt)} ${a.event.padEnd(16)} ${a.detail}`);
}

line("NOTIFICATIONS (this user)");
const notes = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { id: "asc" } });
for (const n of notes) {
  console.log(`#${String(n.id).padStart(4)} ${fmt(n.createdAt)} ${n.type.padEnd(12)} "${n.title}" — ${n.body}`);
}
console.log(`-- notifications=${notes.length}`);

line("GLOBAL POSTBACK HEALTH (all providers, all users)");
const grouped = await prisma.postbackLog.groupBy({
  by: ["provider", "outcome"],
  _count: { _all: true },
  orderBy: { _count: { provider: "desc" } },
});
for (const g of grouped) {
  console.log(`  ${g.provider.padEnd(10)} ${g.outcome.padEnd(16)} ${g._count._all}`);
}
const recent = await prisma.postbackLog.findMany({ orderBy: { id: "desc" }, take: 12 });
line("LATEST 12 POSTBACK ROWS (whole site)");
for (const l of recent) {
  console.log(
    `#${String(l.id).padStart(5)} ${fmt(l.createdAt)} ${l.provider.padEnd(8)} ${l.outcome.padEnd(14)} txId=${l.txId} coins=${l.coins} query="${l.query.slice(0, 220)}"`,
  );
}

line("SITE-WIDE ATTEMPT STATUS");
const anyStatus = await prisma.surveyAttempt.groupBy({ by: ["status"], _count: { _all: true } });
for (const s of anyStatus) console.log(`  ${s.status.padEnd(12)} ${s._count._all}`);

line("SURVEYS IN CATALOGUE (by provider)");
const surveyGroups = await prisma.survey.groupBy({
  by: ["provider", "isActive"],
  _count: { _all: true },
});
for (const s of surveyGroups) {
  console.log(`  ${s.provider.padEnd(12)} isActive=${String(s.isActive).padEnd(6)} ${s._count._all}`);
}

// Home-IP shares: a household that plays from one connection (informational).
line("OTHER ACCOUNTS ON THIS SIGNUP IP");
if (user.signupIp && user.signupIp !== "local") {
  const siblings = await prisma.user.findMany({
    where: { signupIp: user.signupIp, id: { not: user.id } },
    select: { id: true, email: true, isFlagged: true, createdAt: true },
    take: 10,
  });
  for (const s of siblings) {
    console.log(`  #${s.id} ${s.email} flagged=${s.isFlagged} createdAt=${fmt(s.createdAt)}`);
  }
  console.log(`  total siblings=${siblings.length}`);
} else {
  console.log(`  signupIp="${user.signupIp}"`);
}

await prisma.$disconnect();