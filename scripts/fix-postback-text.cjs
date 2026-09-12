// One-time cleanup: rewrite ledger descriptions and notifications that leak
// internal terms ("cpx postback") into user-facing text. Safe to re-run —
// rows without "postback" are left untouched. Delete after use.
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const PARTNER_NAMES = {
  cpx: "CPX Research",
  trayistats: "TrayiStats",
  bitlabs: "BitLabs",
  inbrain: "inBrain",
  adgate: "AdGate Media",
  theoremreach: "TheoremReach",
  torox: "Torox",
  mock: "Practice survey",
};
const label = (key) => PARTNER_NAMES[key] ?? key;

async function main() {
  const txs = await prisma.coinTransaction.findMany({
    where: { description: { contains: "postback" } },
  });
  let txFixed = 0;
  for (const tx of txs) {
    const key = (tx.description.match(/· ([a-z0-9_]+) postback/) || [])[1];
    if (!key) continue;
    const description =
      tx.type === "reversal"
        ? "Reward reversed — the research partner rejected the response"
        : `Earned from ${label(key)}`;
    await prisma.coinTransaction.update({ where: { id: tx.id }, data: { description } });
    txFixed++;
  }

  const notes = await prisma.notification.findMany({
    where: { OR: [{ title: { contains: "postback" } }, { body: { contains: "postback" } }] },
  });
  let noteFixed = 0;
  for (const n of notes) {
    const title = n.title.replace(/postback/g, "reward").trim();
    const body = n.body.replace(/"([a-z0-9_]+) postback"/g, (_, k) => label(k));
    await prisma.notification.update({ where: { id: n.id }, data: { title, body } });
    noteFixed++;
  }

  console.log(`coin transactions rewritten: ${txFixed}/${txs.length}`);
  console.log(`notifications rewritten: ${noteFixed}/${notes.length}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
