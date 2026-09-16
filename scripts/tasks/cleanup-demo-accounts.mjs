/**
 * Removes test / demo accounts and their play money from a SkySurvey database.
 *
 * Every non-admin user whose email is not listed in --keep is deleted together
 * with all rows that belong to it (notifications, score events, survey ratings,
 * attempts, coin transactions, redeem requests, activity logs), so the user-side
 * leaderboard and the admin panel stop showing them.
 *
 * --purge-demo-ledger additionally strips, for the kept users, the coins earned
 * on the built-in demo surveys (Survey.provider = "mock") and any manually
 * injected test bonus rows (CoinTransaction.category = "test"), along with the
 * matching demo attempts so ledger and attempts stay consistent.
 *
 * --purge-demo-surveys removes the built-in demo (mock) catalogue itself, along
 * with any leftover attempts, ratings and postback rows that point at it. With
 * no demo rows left a user cannot earn demo coins again.
 *
 * Nothing is written unless --apply is passed, and before anything is deleted a
 * JSON snapshot of every removed row is written to --backup.
 *
 * Usage:
 *   node scripts/tasks/cleanup-demo-accounts.mjs --keep=a@b.com,c@d.com            # dry run
 *   node scripts/tasks/cleanup-demo-accounts.mjs --keep=a@b.com,c@d.com --apply
 *   node scripts/tasks/cleanup-demo-accounts.mjs --keep=a@b.com --purge-demo-ledger --purge-demo-surveys --apply
 *   node scripts/neon-run.mjs scripts/tasks/cleanup-demo-accounts.mjs --keep=... --apply
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (name, fallback = "") => {
  const hit = args.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : fallback;
};

const apply = has("--apply");
const purgeDemoLedger = has("--purge-demo-ledger");
const purgeDemoSurveys = has("--purge-demo-surveys");
const keepEmails = valueOf("--keep")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
const backupDir = valueOf("--backup") || path.resolve(process.cwd(), "..", "_backup");

if (keepEmails.length === 0) {
  console.error(
    "Refusing to run: pass the accounts that must survive as --keep=email1,email2\n" +
      "(admin accounts are always kept, everything else would be deleted).",
  );
  process.exit(1);
}

// A demo survey is the built-in mock catalogue the app ships before a router is
// live. The ledger text changed over time, so both spellings are matched.
const DEMO_LEDGER_TEXTS = ["demo survey", "Demo survey", "Practice survey", "practice survey"];

try {
  const users = await prisma.user.findMany({ orderBy: { id: "asc" } });
  const keepSet = new Set(keepEmails);
  const doomed = users.filter((u) => u.role !== "admin" && !keepSet.has(u.email.toLowerCase()));
  const kept = users.filter((u) => !doomed.includes(u));
  const doomedIds = doomed.map((u) => u.id);
  const keptIds = kept.map((u) => u.id);

  console.log(`Database users: ${users.length}`);
  console.log("\nKEEPING:");
  for (const u of kept) console.log(`  #${u.id} ${u.email} (${u.role})`);

  console.log("\nDELETING:");
  for (const u of doomed) {
    const [coins, attempts, redeems] = await Promise.all([
      prisma.coinTransaction.aggregate({
        where: { userId: u.id },
        _sum: { coins: true },
        _count: { _all: true },
      }),
      prisma.surveyAttempt.count({ where: { userId: u.id } }),
      prisma.redeemRequest.count({ where: { userId: u.id } }),
    ]);
    console.log(
      `  #${u.id} ${u.email} (${u.username || "-"}) — coins ${coins._sum.coins ?? 0} in ${coins._count._all} rows, attempts ${attempts}, redeems ${redeems}`,
    );
  }
  if (doomed.length === 0) console.log("  (nothing)");

  // ---------------------------------------------------------------------
  // What the kept users still hold from the demo catalogue, plus everything
  // that is about to be dropped so --apply can write a backup first.
  // ---------------------------------------------------------------------
  const mockSurveys = await prisma.survey.findMany({ where: { provider: "mock" }, select: { id: true } });
  const mockIds = mockSurveys.map((s) => s.id);

  // Anything at all still pointing at the demo catalogue, whoever it belongs to.
  const mockAttempts = mockIds.length
    ? await prisma.surveyAttempt.findMany({
        where: { surveyId: { in: mockIds } },
        select: { id: true, userId: true, status: true, coinsCredited: true },
      })
    : [];
  const mockRatings = mockIds.length
    ? await prisma.surveyRating.count({ where: { surveyId: { in: mockIds } } })
    : 0;
  const mockPostbacks = await prisma.postbackLog.count({ where: { provider: "mock" } });

  const demoAttempts =
    keptIds.length && mockIds.length
      ? await prisma.surveyAttempt.findMany({
          where: { surveyId: { in: mockIds }, userId: { in: keptIds } },
        })
      : [];
  const demoAttemptIds = demoAttempts.map((a) => a.id);

  const demoLedger = keptIds.length
    ? await prisma.coinTransaction.findMany({
        where: {
          userId: { in: keptIds },
          OR: [{ category: "test" }, ...DEMO_LEDGER_TEXTS.map((t) => ({ description: { contains: t } }))],
        },
      })
    : [];
  const demoLedgerIds = demoLedger.map((c) => c.id);

  if (purgeDemoLedger) {
    console.log("\nDEMO LEDGER CLEANUP (kept users):");
    console.log(`  demo (mock) survey catalogue : ${mockIds.length} surveys`);
    console.log(`  demo attempts to remove      : ${demoAttempts.length}`);
    console.log(
      `  demo / test coin rows        : ${demoLedger.length} worth ${demoLedger.reduce((a, c) => a + c.coins, 0)} coins`,
    );
    for (const c of demoLedger.slice(0, 15)) {
      console.log(
        `     id=${c.id} user=${c.userId} type=${c.type} coins=${c.coins} desc="${c.description}"`,
      );
    }
    if (demoLedger.length > 15) console.log(`     … ${demoLedger.length - 15} more`);
  }

  if (purgeDemoSurveys) {
    const demoCoinsLeft = mockAttempts.reduce((a, x) => a + x.coinsCredited, 0);
    console.log("\nDEMO SURVEY CATALOGUE CLEANUP:");
    console.log(`  demo (mock) surveys to delete : ${mockSurveys.length}`);
    console.log(`  attempts, ratings, postbacks  : ${mockAttempts.length}, ${mockRatings}, ${mockPostbacks}`);
    if (demoCoinsLeft > 0 && !purgeDemoLedger) {
      console.log(
        `  WARNING: those attempts still hold ${demoCoinsLeft} coins in the ledger — add --purge-demo-ledger too.`,
      );
    }
  }

  if (!apply) {
    console.log("\nDry run only — nothing was changed. Re-run with --apply to execute.");
  } else {
    const snapshot = {
      takenAt: new Date().toISOString(),
      keepEmails,
      users: doomed,
      notifications: await prisma.notification.findMany({ where: { userId: { in: doomedIds } } }),
      scoreEvents: await prisma.scoreEvent.findMany({ where: { userId: { in: doomedIds } } }),
      ratings: await prisma.surveyRating.findMany({ where: { userId: { in: doomedIds } } }),
      attempts: await prisma.surveyAttempt.findMany({ where: { userId: { in: doomedIds } } }),
      coinTransactions: await prisma.coinTransaction.findMany({ where: { userId: { in: doomedIds } } }),
      redeemRequests: await prisma.redeemRequest.findMany({ where: { userId: { in: doomedIds } } }),
      activityLogs: await prisma.activityLog.findMany({ where: { userId: { in: doomedIds } } }),
      purgedDemoAttempts: demoAttempts,
      purgedDemoLedger: demoLedger,
      purgedDemoSurveys: purgeDemoSurveys ? mockSurveys : [],
      purgedDemoSurveyAttempts: purgeDemoSurveys ? mockAttempts : [],
    };
    await mkdir(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const file = path.join(backupDir, `demo-cleanup-${stamp}.json`);
    await writeFile(file, JSON.stringify(snapshot, null, 2), "utf8");
    console.log(`\nBackup written: ${file}`);

    // Children before parents: every relation except ActivityLog (SET NULL) and
    // the optional referrer is RESTRICT, so the order below matters.
    const result = await prisma.$transaction(async (tx) => {
      const counts = {};
      counts.notifications = (await tx.notification.deleteMany({ where: { userId: { in: doomedIds } } })).count;
      counts.scoreEvents = (await tx.scoreEvent.deleteMany({ where: { userId: { in: doomedIds } } })).count;
      counts.ratings = (await tx.surveyRating.deleteMany({ where: { userId: { in: doomedIds } } })).count;
      counts.attempts = (await tx.surveyAttempt.deleteMany({ where: { userId: { in: doomedIds } } })).count;
      counts.coinTransactions = (
        await tx.coinTransaction.deleteMany({ where: { userId: { in: doomedIds } } })
      ).count;
      counts.redeemRequests = (
        await tx.redeemRequest.deleteMany({ where: { userId: { in: doomedIds } } })
      ).count;
      counts.activityLogs = (await tx.activityLog.deleteMany({ where: { userId: { in: doomedIds } } })).count;
      counts.referralsCleared = (
        await tx.user.updateMany({ where: { referredById: { in: doomedIds } }, data: { referredById: null } })
      ).count;
      counts.users = (await tx.user.deleteMany({ where: { id: { in: doomedIds } } })).count;

      if (purgeDemoLedger) {
        counts.demoRatings = (
          await tx.surveyRating.deleteMany({ where: { attemptId: { in: demoAttemptIds } } })
        ).count;
        counts.demoAttempts = (
          await tx.surveyAttempt.deleteMany({ where: { id: { in: demoAttemptIds } } })
        ).count;
        counts.demoLedgerRows = (
          await tx.coinTransaction.deleteMany({ where: { id: { in: demoLedgerIds } } })
        ).count;
      }

      if (purgeDemoSurveys) {
        // Ratings and attempts point at the surveys, so they go first; the demo
        // rows of the customers we just deleted are already gone at this point.
        counts.demoSurveyRatings = (
          await tx.surveyRating.deleteMany({ where: { surveyId: { in: mockIds } } })
        ).count;
        counts.demoSurveyAttempts = (
          await tx.surveyAttempt.deleteMany({ where: { surveyId: { in: mockIds } } })
        ).count;
        counts.demoSurveys = (await tx.survey.deleteMany({ where: { provider: "mock" } })).count;
        counts.demoSurveyPostbacks = (
          await tx.postbackLog.deleteMany({ where: { provider: "mock" } })
        ).count;
      }
      return counts;
    });

    console.log("\n=== DELETED ===");
    for (const [key, value] of Object.entries(result)) console.log(`  ${key.padEnd(18)}: ${value}`);
  }

  const remaining = await prisma.user.findMany({
    orderBy: { id: "asc" },
    select: { id: true, email: true, role: true },
  });
  console.log("\n=== USERS NOW IN THE DATABASE ===");
  for (const u of remaining) {
    const sum = await prisma.coinTransaction.aggregate({ where: { userId: u.id }, _sum: { coins: true } });
    console.log(`  #${u.id} ${u.email} (${u.role}) — ${sum._sum.coins ?? 0} coins`);
  }
  const total = await prisma.coinTransaction.aggregate({ _sum: { coins: true } });
  const demoLeft = await prisma.surveyAttempt.count({ where: { surveyId: { in: mockIds } } });
  const demoSurveysLeft = await prisma.survey.count({ where: { provider: "mock" } });
  const liveSurveysLeft = await prisma.survey.count({ where: { provider: { not: "mock" } } });
  console.log(`\nCoins across all users    : ${total._sum.coins ?? 0}`);
  console.log(`Demo-survey attempts left : ${demoLeft}`);
  console.log(`Demo (mock) surveys left  : ${demoSurveysLeft}`);
  console.log(`Live surveys in catalogue : ${liveSurveysLeft}`);
} finally {
  await prisma.$disconnect();
}