/**
 * Deep-research diagnosis for "survey completed notification but no coins".
 * READ-ONLY: never writes. Run via:
 *   node scripts/neon-run.mjs scripts/tasks/diagnose-missing-credits.mjs
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const fmt = (d) => (d ? d.toISOString().replace("T", " ").slice(0, 19) : "-");
const mask = (email) => {
  const [u, d] = String(email || "?").split("@");
  if (!d) return "***";
  return `${u.slice(0, 2)}***@${d}`;
};

try {
  const cfg = await prisma.config.findMany();
  const cfgMap = Object.fromEntries(cfg.map((r) => [r.key, r.value]));
  console.log("=== CONFIG ===");
  console.log(`share=${cfgMap.reward_share_percent ?? 70} rate=${cfgMap.coin_rate_cents ?? 1}`);

  console.log("\n=== POSTBACK OUTCOMES BY PROVIDER ===");
  const byOutcome = await prisma.postbackLog.groupBy({
    by: ["provider", "outcome"],
    _count: { _all: true },
    _sum: { coins: true, payoutCents: true },
  });
  for (const g of byOutcome) {
    console.log(`  ${g.provider} ${g.outcome} n=${g._count._all} coins=${g._sum.coins ?? 0} payout=${g._sum.payoutCents ?? 0}`);
  }

  const zeroTotal = await prisma.postbackLog.count({ where: { outcome: "credited", coins: 0 } });
  const creditedTotal = await prisma.postbackLog.count({ where: { outcome: "credited" } });
  console.log(`\nTOTAL credited=${creditedTotal} of which coins=0 -> ${zeroTotal}`);

  const zeroCredited = await prisma.postbackLog.findMany({
    where: { outcome: "credited", coins: 0 },
    orderBy: { id: "desc" },
    take: 30,
  });
  const keyFreq = new Map();
  for (const l of zeroCredited) {
    try {
      for (const k of new URLSearchParams(l.query).keys()) keyFreq.set(k, (keyFreq.get(k) ?? 0) + 1);
    } catch { /* ignore */ }
  }
  console.log("param keys on zero-credit rows:");
  for (const [k, n] of [...keyFreq.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${k} (${n}x)`);
  console.log("sample zero-credit raw queries (sig redacted, first 5):");
  for (const l of zeroCredited.slice(0, 5)) {
    const q = new URLSearchParams(l.query);
    q.delete("hash"); q.delete("signature"); q.delete("sig");
    console.log(`  #${l.id} ${fmt(l.createdAt)} tx=${l.txId} payout=${l.payoutCents} q="${q.toString().slice(0, 300)}" note="${l.note}"`);
  }

  console.log("\n=== NONZERO CREDITED SAMPLE (control, latest 5) ===");
  const nz = await prisma.postbackLog.findMany({ where: { outcome: "credited" }, orderBy: { id: "desc" }, take: 50 });
  const nzPos = nz.filter((r) => r.coins > 0).slice(0, 5);
  if (nzPos.length === 0) console.log("  (no nonzero credited rows in latest 50!)");
  for (const l of nzPos) {
    const q = new URLSearchParams(l.query);
    q.delete("hash"); q.delete("signature"); q.delete("sig");
    console.log(`  #${l.id} ${fmt(l.createdAt)} payout=${l.payoutCents} coins=${l.coins} q="${q.toString().slice(0, 300)}"`);
  }

  console.log("\n=== COMPLETED ATTEMPTS WITH coinsCredited=0 ===");
  const zeroAttTotal = await prisma.surveyAttempt.count({ where: { status: "completed", coinsCredited: 0 } });
  const compTotal = await prisma.surveyAttempt.count({ where: { status: "completed" } });
  console.log(`completed total=${compTotal}, with 0 coins=${zeroAttTotal}`);
  const zeroAttSample = await prisma.surveyAttempt.findMany({
    where: { status: "completed", coinsCredited: 0 },
    orderBy: { id: "desc" },
    take: 10,
    include: { survey: { select: { provider: true, title: true } }, user: { select: { email: true } } },
  });
  for (const a of zeroAttSample) {
    console.log(`  att #${a.id} user=${mask(a.user.email)} prov=${a.survey?.provider} cpi=${a.cpiCents} at=${fmt(a.completedAt)}`);
  }

  console.log("\n=== ATTEMPT STATUS SITE-WIDE ===");
  const statuses = await prisma.surveyAttempt.groupBy({ by: ["status"], _count: { _all: true } });
  for (const s of statuses) console.log(`  ${s.status} ${s._count._all}`);

  console.log("\n=== REVERSALS ===");
  const revCount = await prisma.surveyAttempt.count({ where: { status: "reversed" } });
  const revTx = await prisma.coinTransaction.aggregate({ where: { type: "reversal" }, _sum: { coins: true }, _count: { _all: true } });
  console.log(`reversed attempts=${revCount} reversal rows=${revTx._count._all} coins=${revTx._sum.coins ?? 0}`);

  console.log("\n=== NOTIFICATIONS vs LEDGER ===");
  const earnNotes = await prisma.notification.findMany({ where: { type: "survey", title: { contains: "earned" } } });
  const promised = new Map();
  for (const n of earnNotes) {
    const m = n.title.match(/earned\s+(\d+)\s+coins/i) || n.body.match(/earned\s+(\d+)\s+coins/i);
    const c = m ? Number(m[1]) : 0;
    const cur = promised.get(n.userId) ?? { n: 0, coins: 0 };
    promised.set(n.userId, { n: cur.n + 1, coins: cur.coins + c });
  }
  const surveyTx = await prisma.coinTransaction.groupBy({
    by: ["userId"], where: { type: "survey" }, _sum: { coins: true }, _count: { _all: true },
  });
  const ledger = new Map(surveyTx.map((g) => [g.userId, { coins: g._sum.coins ?? 0, rows: g._count._all }]));
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  const emailOf = new Map(users.map((u) => [u.id, u.email]));
  let mismatch = 0;
  for (const [uid, p] of promised) {
    const led = ledger.get(uid) ?? { coins: 0, rows: 0 };
    if (p.coins > 0 && led.rows === 0) {
      mismatch++;
      if (mismatch <= 20) console.log(`  user #${uid} ${mask(emailOf.get(uid))}: promised ${p.coins} in ${p.n} note(s), ledger rows=0`);
    }
  }
  console.log(`promised-but-zero-ledger users: ${mismatch} (of ${promised.size} promised users)`);
  const genericNotes = await prisma.notification.count({ where: { type: "survey", title: "Survey completed" } });
  console.log(`generic zero-coin notes=${genericNotes} vs earned notes=${earnNotes.length}`);

  const zeroTx = await prisma.coinTransaction.count({ where: { type: "survey", coins: 0 } });
  const surveyTxTotal = await prisma.coinTransaction.count({ where: { type: "survey" } });
  console.log(`survey ledger rows total=${surveyTxTotal}, coins=0 -> ${zeroTx}`);
} finally {
  await prisma.$disconnect();
}

