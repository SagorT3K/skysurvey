/**
 * Aligns the stored rate-limit config with the current app:
 *
 *   - the per-user hourly survey cap no longer exists, so its config row is removed
 *   - the shared-IP account cap is off by default (max_accounts_per_ip = 0 = unlimited)
 *
 * Databases seeded by an older version still hold max_attempts_per_hour = 20 and
 * max_accounts_per_ip = 2. getConfig() prefers stored rows over the in-code
 * defaults, so those values have to be rewritten here or the old limits stay live.
 *
 * Nothing is written unless --apply is passed.
 *
 * Usage:
 *   node scripts/tasks/normalize-rate-limits.mjs                                  # local sqlite, dry run
 *   node scripts/neon-run.mjs scripts/tasks/normalize-rate-limits.mjs --apply     # production (Neon)
 *
 * Options:
 *   --apply                    write the changes
 *   --max-accounts-per-ip=<n>  store n instead of 0; n must be 1 or more (0 means unlimited)
 *   --clear-auto-flags         also clear isFlagged on accounts that were flagged by the
 *                              now-removed shared_ip / attempt_velocity checks, so they
 *                              can cash out again (ban reasons are matched exactly, so
 *                              bot or proxy flags stay in place)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (name, fallback = "") => {
  const hit = args.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : fallback;
};

const apply = has("--apply");
const clearAutoFlags = has("--clear-auto-flags");
const obsoleteKeys = ["max_attempts_per_hour"];

const rawCap = valueOf("--max-accounts-per-ip", "0").trim();
const cap = Number(rawCap);
if (!Number.isInteger(cap) || cap < 0) {
  console.error(`--max-accounts-per-ip must be a whole number >= 0 (got "${rawCap}")`);
  process.exit(1);
}

// Only reasons written by the two removed checks are matched — a general
// "flagged" cleanup would also release accounts blocked for bot or proxy traffic.
const AUTO_FLAG_MARKERS = ["shared_ip", "attempt_velocity"];

try {
  // ---------------------------------------------------------------------
  // 1. Stored rate-limit rows
  // ---------------------------------------------------------------------
  const rows = await prisma.config.findMany({ where: { key: { in: [...obsoleteKeys, "max_accounts_per_ip"] } } });
  const byKey = new Map(rows.map((r) => [r.key, r.value]));

  console.log("=== RATE-LIMIT CONFIG ROWS ===");
  for (const key of obsoleteKeys) {
    const value = byKey.get(key);
    console.log(`  ${key.padEnd(24)}: ${value === undefined ? "(absent)" : `"${value}"`}  -> delete`);
  }
  const currentCap = byKey.get("max_accounts_per_ip");
  console.log(
    `  ${"max_accounts_per_ip".padEnd(24)}: ${currentCap === undefined ? "(absent)" : `"${currentCap}"`}  -> "${cap}"${cap === 0 ? " (unlimited)" : ""}`,
  );

  // ---------------------------------------------------------------------
  // 2. Accounts blocked by the removed checks
  // ---------------------------------------------------------------------
  const autoFlagged = await prisma.user.findMany({
    where: {
      isFlagged: true,
      OR: AUTO_FLAG_MARKERS.map((m) => ({ flagReason: { contains: m } })),
    },
    select: { id: true, email: true, flagReason: true },
  });

  console.log("\n=== ACCOUNTS FLAGGED BY THE REMOVED CHECKS ===");
  for (const u of autoFlagged) {
    console.log(`  #${u.id} ${u.email} — "${u.flagReason}"`);
  }
  if (autoFlagged.length === 0) console.log("  (none)");
  if (autoFlagged.length > 0 && !clearAutoFlags) {
    console.log("  pass --clear-auto-flags to unflag these accounts (they cannot cash out while flagged)");
  }

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply.");
  } else {
    for (const key of obsoleteKeys) {
      if (!byKey.has(key)) continue;
      await prisma.config.delete({ where: { key } });
      console.log(`\ndeleted config row ${key}`);
    }
    await prisma.config.upsert({
      where: { key: "max_accounts_per_ip" },
      update: { value: String(cap) },
      create: { key: "max_accounts_per_ip", value: String(cap) },
    });
    console.log(`saved max_accounts_per_ip = ${cap}${cap === 0 ? " (unlimited)" : ""}`);

    if (clearAutoFlags && autoFlagged.length > 0) {
      const ids = autoFlagged.map((u) => u.id);
      await prisma.user.updateMany({ where: { id: { in: ids } }, data: { isFlagged: false, flagReason: "" } });
      await prisma.activityLog.createMany({
        data: ids.map((userId) => ({
          userId,
          event: "fraud_flag_cleared",
          detail: "Auto flag from the removed shared-IP / hourly-cap checks cleared by normalize-rate-limits",
        })),
      });
      console.log(`cleared the fraud flag on ${ids.length} account(s): ${ids.join(", ")}`);
    }
  }

  const finalRows = await prisma.config.findMany({ orderBy: { key: "asc" } });
  console.log("\n=== CONFIG TABLE AFTER THIS RUN ===");
  for (const r of finalRows) console.log(`  ${r.key.padEnd(24)}: ${r.value}`);
} finally {
  await prisma.$disconnect();
}