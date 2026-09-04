/**
 * One-time data fix: redeem ledger entries used to store the global request id
 * ("Redeem request #4"), while users now see a per-user serial. Rewrites each
 * user's redeem transactions to the per-user serial ("Redeem request #1").
 * Idempotent — descriptions that no longer match "<current> global id" are left alone.
 *
 *   node scripts/tasks/renumber-redeem-ledger.mjs
 *   node scripts/neon-run.mjs scripts/tasks/renumber-redeem-ledger.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const users = await prisma.user.findMany({ select: { id: true } });
let fixed = 0;

for (const u of users) {
  const requests = await prisma.redeemRequest.findMany({
    where: { userId: u.id },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  for (let i = 0; i < requests.length; i++) {
    const seq = i + 1;
    const oldDesc = `Redeem request #${requests[i].id}`;
    if (oldDesc === `Redeem request #${seq}`) continue;
    const res = await prisma.coinTransaction.updateMany({
      where: { userId: u.id, type: "redeem", description: oldDesc },
      data: { description: `Redeem request #${seq}` },
    });
    fixed += res.count;
  }
}

console.log(`Renumbered ${fixed} ledger entries across ${users.length} users.`);
await prisma.$disconnect();
