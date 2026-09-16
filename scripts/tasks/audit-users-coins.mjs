/**
 * Read-only audit: lists every user with their coin balance (sum of
 * CoinTransactions) and prints totals, flagging likely test / demo accounts.
 *
 * Usage:
 *   node scripts/tasks/audit-users-coins.mjs            # local sqlite (prisma/dev.db)
 *   node scripts/neon-run.mjs scripts/tasks/audit-users-coins.mjs   # production (Neon)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// An account is treated as a test / demo account when its email or username
// carries one of these markers. Real accounts never contain them.
const TEST_MARKERS = ["demo", "test", "dummy", "sample", "trial", "fake", "sandbox", "admin"];

const matches = (u) => {
  const haystack = `${u.email} ${u.username}`.toLowerCase();
  const hit = TEST_MARKERS.find((m) => haystack.includes(m));
  return hit || null;
};

try {
  const users = await prisma.user.findMany({ orderBy: { id: "asc" } });
  const grouped = await prisma.coinTransaction.groupBy({
    by: ["userId"],
    _sum: { coins: true },
    _count: { _all: true },
  });
  const balances = new Map(
    grouped.map((g) => [g.userId, { coins: g._sum.coins ?? 0, count: g._count._all }]),
  );

  const attempts = await prisma.surveyAttempt.groupBy({
    by: ["userId"],
    _count: { _all: true },
  });
  const attemptCounts = new Map(attempts.map((a) => [a.userId, a._count._all]));

  const redeems = await prisma.redeemRequest.groupBy({
    by: ["userId"],
    _sum: { coins: true },
    _count: { _all: true },
  });
  const redeemSums = new Map(
    redeems.map((r) => [r.userId, { coins: r._sum.coins ?? 0, count: r._count._all }]),
  );

  const rows = users.map((u) => {
    const bal = balances.get(u.id) ?? { coins: 0, count: 0 };
    const red = redeemSums.get(u.id) ?? { coins: 0, count: 0 };
    return {
      id: u.id,
      email: u.email,
      username: u.username,
      role: u.role,
      marker: matches(u),
      active: u.isActive,
      flagged: u.isFlagged,
      coins: bal.coins,
      txns: bal.count,
      attempts: attemptCounts.get(u.id) ?? 0,
      redeemCoins: red.coins,
      redeems: red.count,
      createdAt: u.createdAt.toISOString().slice(0, 10),
    };
  });

  const pad = (v, n) => String(v).padEnd(n).slice(0, n);
  console.log(
    `${pad("id", 5)}${pad("email", 34)}${pad("user", 14)}${pad("role", 8)}${pad("marker", 9)}${pad("coins", 10)}${pad("txn", 5)}${pad("att", 5)}${pad("redeem", 7)}${pad("created", 11)}`,
  );
  for (const r of rows) {
    console.log(
      `${pad(r.id, 5)}${pad(r.email, 34)}${pad(r.username, 14)}${pad(r.role, 8)}${pad(r.marker ?? "-", 9)}${pad(r.coins, 10)}${pad(r.txns, 5)}${pad(r.attempts, 5)}${pad(r.redeems, 7)}${pad(r.createdAt, 11)}`,
    );
  }

  const sum = (list, key) => list.reduce((acc, r) => acc + r[key], 0);
  const testRows = rows.filter((r) => r.marker);
  const realRows = rows.filter((r) => !r.marker);
  const byMarker = {};
  for (const r of testRows) byMarker[r.marker] = (byMarker[r.marker] ?? 0) + 1;

  console.log("\n=== SUMMARY ===");
  console.log(`users total           : ${rows.length}`);
  console.log(`test/demo accounts    : ${testRows.length} ${JSON.stringify(byMarker)}`);
  console.log(`other accounts        : ${realRows.length}`);
  console.log(`coins ALL users       : ${sum(rows, "coins")}`);
  console.log(`coins test/demo only  : ${sum(testRows, "coins")}`);
  console.log(`coins other accounts  : ${sum(realRows, "coins")}`);
  console.log(`redeem coins test/demo: ${sum(testRows, "redeemCoins")}`);
  console.log(`redeem coins other    : ${sum(realRows, "redeemCoins")}`);

  const config = await prisma.config.findMany({ orderBy: { key: "asc" } });
  console.log("\n=== CONFIG ===");
  for (const c of config) console.log(`  ${c.key}=${c.value}`);

  // ---------------------------------------------------------------------
  // Demo / practice survey coins (provider = "mock", user-facing text
  // "Earned from Practice survey") and the "Test filler entry" rows that
  // scripts/cleanup-test-filler.mjs exists to remove.
  // ---------------------------------------------------------------------
  const mockSurveys = await prisma.survey.findMany({
    where: { provider: "mock" },
    select: { id: true },
  });
  const mockIds = mockSurveys.map((s) => s.id);

  const demoAttempts = mockIds.length
    ? await prisma.surveyAttempt.findMany({
        where: { surveyId: { in: mockIds }, status: "completed" },
        select: { userId: true, coinsCredited: true, surveyId: true },
      })
    : [];
  const liveAttempts = await prisma.surveyAttempt.findMany({
    where: { status: "completed", ...(mockIds.length ? { surveyId: { notIn: mockIds } } : {}) },
    select: { userId: true, coinsCredited: true },
  });

  const txnBreakdown = await prisma.coinTransaction.groupBy({
    by: ["type", "category", "description"],
    _sum: { coins: true },
    _count: { _all: true },
    orderBy: { _sum: { coins: "desc" } },
  });

  const [filler, practice] = await Promise.all([
    prisma.coinTransaction.aggregate({
      where: { description: { startsWith: "Test filler entry" } },
      _sum: { coins: true },
      _count: { _all: true },
    }),
    prisma.coinTransaction.aggregate({
      where: { description: { startsWith: "Earned from Practice survey" } },
      _sum: { coins: true },
      _count: { _all: true },
    }),
  ]);

  const sumCredited = (list) => list.reduce((acc, a) => acc + a.coinsCredited, 0);

  console.log("\n=== DEMO (mock/practice) SURVEY ATTEMPTS ===");
  console.log(`mock surveys in catalogue : ${mockIds.length}`);
  console.log(`completed demo attempts   : ${demoAttempts.length}`);
  console.log(`demo coins credited       : ${sumCredited(demoAttempts)}`);
  console.log(`completed live attempts   : ${liveAttempts.length}`);
  console.log(`live coins credited       : ${sumCredited(liveAttempts)}`);

  // Which providers the catalogue currently holds — after the demo cleanup this
  // should list only the live router(s).
  const surveyProviders = await prisma.survey.groupBy({
    by: ["provider", "isActive"],
    _count: { _all: true },
  });
  console.log("\n=== SURVEYS BY PROVIDER ===");
  for (const p of surveyProviders) {
    const attempts = await prisma.surveyAttempt.count({
      where: { survey: { provider: p.provider } },
    });
    console.log(
      `  ${pad(p.provider, 16)}active=${pad(p.isActive, 6)}surveys=${pad(p._count._all, 5)}attempts=${attempts}`,
    );
  }

  console.log("\n=== TEST-FILLER / PRACTICE LEDGER ROWS ===");
  console.log(
    `"Test filler entry" rows  : ${filler._count._all}  coins ${filler._sum.coins ?? 0}`,
  );
  console.log(
    `"Practice survey" rows    : ${practice._count._all}  coins ${practice._sum.coins ?? 0}`,
  );

  console.log("\n=== COIN TRANSACTIONS BY TYPE / CATEGORY / DESCRIPTION ===");
  for (const b of txnBreakdown) {
    console.log(
      `  ${pad(b.type, 14)}${pad(b.category, 20)}${pad(b._count._all, 6)}${pad(b._sum.coins, 10)}  ${b.description}`,
    );
  }

  console.log("\n=== DEMO COINS PER USER ===");
  const perUser = new Map();
  for (const a of demoAttempts) perUser.set(a.userId, (perUser.get(a.userId) ?? 0) + a.coinsCredited);
  for (const [id, coins] of perUser) {
    const u = rows.find((r) => r.id === id);
    console.log(`  user ${id} (${u?.email ?? "?"}) : ${coins} demo coins`);
  }
  console.log(`  TOTAL demo-survey coins : ${sumCredited(demoAttempts)}`);

  // ---------------------------------------------------------------------
  // Per-user split of where the coins came from: demo (mock) surveys, live
  // router surveys, bonuses, and what was taken out again via redemptions.
  // ---------------------------------------------------------------------
  const liveByUser = new Map();
  for (const a of liveAttempts) liveByUser.set(a.userId, (liveByUser.get(a.userId) ?? 0) + a.coinsCredited);

  const txnAll = await prisma.coinTransaction.findMany({
    select: { userId: true, type: true, coins: true },
  });
  const redeemByUser = new Map();
  for (const t of txnAll) {
    if (t.type === "redeem" || t.type === "reversal") {
      redeemByUser.set(t.userId, (redeemByUser.get(t.userId) ?? 0) + t.coins);
    }
  }

  console.log("\n=== COIN ORIGIN PER USER ===");
  console.log(
    `${pad("id", 5)}${pad("email", 34)}${pad("demo", 8)}${pad("live", 8)}${pad("other", 8)}${pad("payouts", 9)}${pad("net", 8)}`,
  );
  for (const r of rows) {
    const demo = perUser.get(r.id) ?? 0;
    const live = liveByUser.get(r.id) ?? 0;
    const payouts = redeemByUser.get(r.id) ?? 0;
    console.log(
      `${pad(r.id, 5)}${pad(r.email, 34)}${pad(demo, 8)}${pad(live, 8)}${pad(r.coins - demo - live - payouts, 8)}${pad(payouts, 9)}${pad(r.coins, 8)}`,
    );
  }

  // ---------------------------------------------------------------------
  // Who actually cashed out — a test/demo account with a paid request means
  // play money left the business.
  // ---------------------------------------------------------------------
  const redeemRows = await prisma.redeemRequest.findMany({
    orderBy: { id: "asc" },
    include: { user: { select: { email: true, username: true } } },
  });
  console.log("\n=== REDEEM REQUESTS ===");
  for (const r of redeemRows) {
    const marker = matches(r.user) ? "TEST/DEMO" : "real";
    console.log(
      `  #${r.id} user ${r.userId} (${r.user.email}) ${pad(r.status, 9)} ${pad(r.coins, 7)}coins  $${(r.amountCents / 100).toFixed(2)}  ${marker}`,
    );
  }
  console.log(
    `  pending/approved/paid coins: ${redeemRows.filter((r) => ["approved", "paid"].includes(r.status)).reduce((a, r) => a + r.coins, 0)}`,
  );
  console.log(
    `  test/demo account requests : ${redeemRows.filter((r) => matches(r.user)).length}`,
  );
} finally {
  await prisma.$disconnect();
}