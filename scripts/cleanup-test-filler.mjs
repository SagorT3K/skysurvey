/**
 * One-off: list (or delete with --delete) the dummy "Test filler entry"
 * CoinTransactions for a given user in the production database.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/cleanup-test-filler.mjs [--delete]
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const doDelete = process.argv.includes("--delete");

try {
  const rows = await prisma.coinTransaction.findMany({
    where: { description: { startsWith: "Test filler entry" } },
    orderBy: { id: "asc" },
  });
  console.log(`Found ${rows.length} "Test filler" transactions:`);
  for (const r of rows) {
    console.log(`  id=${r.id} userId=${r.userId} type=${r.type} coins=${r.coins} desc="${r.description}" createdAt=${r.createdAt.toISOString()}`);
  }
  if (rows.length === 0) process.exit(0);

  const otherUsers = rows.filter((r) => r.userId !== 7);
  if (otherUsers.length > 0) {
    console.error(`ABORT: ${otherUsers.length} rows belong to other users: ${otherUsers.map((r) => r.id).join(", ")}`);
    process.exit(1);
  }

  if (!doDelete) {
    console.log("\nDry run only — pass --delete to remove these rows.");
  } else {
    const res = await prisma.coinTransaction.deleteMany({
      where: { id: { in: rows.map((r) => r.id) }, userId: 7 },
    });
    console.log(`Deleted ${res.count} rows for userId 7.`);
  }
} finally {
  await prisma.$disconnect();
}
