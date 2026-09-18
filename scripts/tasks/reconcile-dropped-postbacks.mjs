/**
 * Pays back completions that the old postback handler dropped as duplicates.
 *
 * Until the router's own transaction id became the duplicate key, a wall session
 * (CPX Research) was credited only for its FIRST completion: every later survey in
 * the same visit echoed our repeated sub id, so it looked like a retry and the
 * reward was thrown away. Those callbacks are still in PostbackLog as `duplicate`
 * rows, and this task re-settles the genuine ones.
 *
 * A row is skipped when
 *   - another log row already credited the same router transaction (a real retry),
 *   - a PostbackTxn claim exists for it (so re-running cannot pay twice),
 *   - its offer id is listed in --skip-offers,
 *   - the user or the survey it belongs to cannot be identified.
 *
 * Trust score/level changes are deliberately not replayed: the score is a payout
 * bonus, the coins are what the user actually lost.
 *
 * Nothing is written unless --apply is passed.
 *
 * Usage:
 *   node scripts/tasks/reconcile-dropped-postbacks.mjs                                  # dry run
 *   node scripts/tasks/reconcile-dropped-postbacks.mjs --email=user@example.com --apply  # one user
 *   node scripts/neon-run.mjs scripts/tasks/reconcile-dropped-postbacks.mjs --apply      # production (Neon)
 *
 * Options:
 *   --apply                      write the recovered credits
 *   --email=user@example.com     only rows belonging to this account
 *   --provider=cpx               provider key to reconcile (default cpx)
 *   --partner="CPX Research"     display name used in the ledger description
 *   --skip-offers=100,101        offer ids to leave alone (comma separated)
 *   --p-*=name                   override a raw-query param name (see P below)
 *   --payout-unit=usd|cents      unit of the payout param (default usd)
 *   --status-ok=1,complete       completion status values (default 1,complete,completed)
 *   --limit=n                    stop after n payable rows
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// The postback log keeps the router's raw query string, and the router env vars
// live in the deploy environment rather than here, so the param names are read
// with CPX Research's own spellings as defaults.
const P = {
  status: "status",
  payout: "amount_usd",
  providerTxId: "trans_id",
  txId: "sub_id",
  userId: "user_id",
  offerId: "offer_id",
};

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (name, fallback = "") => {
  const hit = args.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : fallback;
};

const apply = has("--apply");
const provider = valueOf("--provider", "cpx").trim().toLowerCase();
const onlyEmail = valueOf("--email").trim().toLowerCase();
const partner = valueOf("--partner", "CPX Research");
const skipOffers = new Set(valueOf("--skip-offers").split(",").map((v) => v.trim()).filter(Boolean));
const payoutUnit = valueOf("--payout-unit", "usd").trim().toLowerCase();
const statusOk = valueOf("--status-ok", "1,complete,completed")
  .split(",")
  .map((v) => v.trim().toLowerCase())
  .filter(Boolean);
const limit = Number(valueOf("--limit", "0")) || 0;

for (const key of Object.keys(P)) {
  const override = valueOf(`--p-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`).trim();
  if (override) P[key] = override;
}

const fmt = (d) => d.toISOString().replace("T", " ").slice(0, 19);
const pad = (v, n) => String(v).padEnd(n).slice(0, n);

/** Same maths as src/lib/ledger.ts (coinsForPayout) and src/lib/score.ts. */
function coinsFor(payoutCents, sharePercent, coinRateCents, score) {
  const level = Math.max(1, Math.floor(score / 100)); // LEVEL_STEP = 100
  const share = sharePercent + (level - 1) * 2; // LEVEL_SHARE_BONUS = 2
  return Math.max(0, Math.round((payoutCents * share) / 100 / coinRateCents));
}
try {
  const configRows = await prisma.config.findMany({
    where: { key: { in: ["reward_share_percent", "coin_rate_cents"] } },
  });
  const configMap = new Map(configRows.map((r) => [r.key, r.value]));
  const sharePercent = Number(configMap.get("reward_share_percent") ?? 70);
  const coinRateCents = Number(configMap.get("coin_rate_cents") ?? 1);

  const [duplicates, credited, claims] = await Promise.all([
    prisma.postbackLog.findMany({ where: { provider, outcome: "duplicate" }, orderBy: { id: "asc" } }),
    prisma.postbackLog.findMany({ where: { provider, outcome: "credited" } }),
    prisma.postbackTxn.findMany({ where: { provider } }),
  ]);

  // A retry repeats the router's transaction id, so anything already credited under
  // that id was paid at the time and must not be paid again.
  const creditedTxnIds = new Set(
    credited.map((l) => new URLSearchParams(l.query).get(P.providerTxId) || "").filter(Boolean),
  );
  const claimed = new Map(claims.map((c) => [c.providerTxId, c]));

  console.log(
    `provider ${provider}: ${duplicates.length} duplicate row(s), ${credited.length} credited row(s), ${claims.length} claim(s)`,
  );
  console.log(`config: reward_share_percent=${sharePercent} coin_rate_cents=${coinRateCents}\n`);

  /** Decides whether one stuck callback is owed money, and who to pay. */
  async function planRow(log) {
    const q = new URLSearchParams(log.query);
    const status = (q.get(P.status) || "").toLowerCase();
    const providerTxId = (q.get(P.providerTxId) || "").trim();
    const txId = (q.get(P.txId) || "").trim();
    const offerId = (q.get(P.offerId) || "").trim();
    const payoutRaw = Number((q.get(P.payout) || "0").replace(/[^0-9.\-]/g, ""));
    const payoutCents = Math.round((payoutUnit === "cents" ? payoutRaw : payoutRaw * 100) || 0);

    if (!statusOk.includes(status)) return { skip: `status ${status || "(absent)"} is not a completion` };
    if (!providerTxId) return { skip: `no ${P.providerTxId} in the callback` };
    if (claimed.has(providerTxId)) return { skip: "already settled by the fixed handler" };
    if (creditedTxnIds.has(providerTxId)) return { skip: "already credited at the time (router retry)" };
    if (offerId && skipOffers.has(offerId)) return { skip: `offer ${offerId} excluded by --skip-offers` };
    if (payoutCents <= 0) return { skip: "no payout in the callback" };

    // Our sub id is the authoritative link to the attempt; the user id the router
    // echoes back is the fallback for completions whose attempt row is gone.
    const attempt = txId ? await prisma.surveyAttempt.findUnique({ where: { txId } }) : null;
    const echoedUserId = Number(q.get(P.userId) || "0");
    const user = attempt
      ? await prisma.user.findUnique({ where: { id: attempt.userId } })
      : echoedUserId
        ? await prisma.user.findUnique({ where: { id: echoedUserId } })
        : null;
    if (!user) return { skip: `cannot identify the account (${P.userId}=${echoedUserId}, ${P.txId}=${txId})` };
    if (onlyEmail && user.email.toLowerCase() !== onlyEmail) return { skip: "another account (--email filter)" };

    let surveyId = attempt?.surveyId ?? null;
    if (surveyId === null) {
      const survey = await prisma.survey.findFirst({
        where: { provider, externalId: offerId },
        select: { id: true },
      });
      if (!survey) return { skip: `no survey row for offer ${offerId}` };
      surveyId = survey.id;
    }

    return {
      row: {
        log,
        providerTxId,
        txId,
        offerId,
        payoutCents,
        surveyId,
        user,
        ip: attempt?.ip || log.ip,
        userAgent: attempt?.userAgent || "",
        coins: coinsFor(payoutCents, sharePercent, coinRateCents, user.score),
      },
    };
  }
  const plan = [];
  const skipped = [];
  for (const log of duplicates) {
    if (limit && plan.length >= limit) break;
    const outcome = await planRow(log);
    if (outcome.skip) skipped.push({ log, why: outcome.skip });
    else plan.push(outcome.row);
  }

  console.log("=== OWED COINS ===");
  console.log(
    `${pad("log", 6)}${pad("when", 21)}${pad("trans_id", 24)}${pad("offer", 15)}${pad("payout", 8)}${pad("coins", 7)}account`,
  );
  for (const r of plan) {
    console.log(
      `${pad(`#${r.log.id}`, 6)}${pad(fmt(r.log.createdAt), 21)}${pad(r.providerTxId, 24)}${pad(r.offerId || "-", 15)}${pad(`$${(r.payoutCents / 100).toFixed(2)}`, 8)}${pad(r.coins, 7)}${r.user.email}`,
    );
  }
  if (plan.length === 0) console.log("  (nothing owed)");

  console.log("\n=== SKIPPED ===");
  for (const s of skipped) {
    console.log(`  log #${s.log.id} ${pad(`tx=${new URLSearchParams(s.log.query).get(P.providerTxId) || "-"}`, 22)} ${s.why}`);
  }
  if (skipped.length === 0) console.log("  (none)");

  const perUser = new Map();
  for (const r of plan) {
    const cur = perUser.get(r.user.id) ?? { user: r.user, rows: 0, coins: 0 };
    perUser.set(r.user.id, { user: r.user, rows: cur.rows + 1, coins: cur.coins + r.coins });
  }
  console.log("\n=== PER ACCOUNT ===");
  for (const { user, rows, coins } of perUser.values()) {
    console.log(`  #${user.id} ${user.email} — ${rows} completion(s), ${coins} coins to recover`);
  }
  console.log(
    `\nTOTAL: ${plan.length} completion(s) owed ${plan.reduce((a, r) => a + r.coins, 0)} coins across ${perUser.size} account(s)`,
  );
  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply to credit these coins.");
  } else {
    let paid = 0;
    for (const r of plan) {
      await prisma.$transaction(async (tx) => {
        // A follow-on attempt: the session's first attempt is already settled and
        // this completion was never recorded, so it gets its own row.
        const attempt = await tx.surveyAttempt.create({
          data: {
            userId: r.user.id,
            surveyId: r.surveyId,
            cpiCents: r.payoutCents,
            status: "completed",
            completedAt: r.log.createdAt,
            coinsCredited: r.coins,
            ip: r.ip,
            userAgent: r.userAgent,
          },
        });
        await tx.coinTransaction.create({
          data: {
            userId: r.user.id,
            type: "survey",
            category: "reconciliation",
            coins: r.coins,
            description: `Earned from ${partner} — reward recovered`,
          },
        });
        // The claim is what makes a second run a no-op.
        await tx.postbackTxn.create({
          data: {
            provider,
            providerTxId: r.providerTxId,
            txId: r.txId,
            userId: r.user.id,
            attemptId: attempt.id,
            payoutCents: r.payoutCents,
            coins: r.coins,
          },
        });
        await tx.activityLog.create({
          data: {
            userId: r.user.id,
            event: "survey_recovered",
            detail: `postback=${r.log.id} tx=${r.providerTxId} offer=${r.offerId || "-"} payout=${r.payoutCents}c coins=${r.coins}`,
            ip: r.ip,
            userAgent: r.userAgent,
          },
        });
      });
      paid += r.coins;
      console.log(`credited ${r.coins} coins to ${r.user.email} for ${r.providerTxId} (offer ${r.offerId || "-"})`);
    }

    // One friendly notification per account, not one per recovered completion.
    for (const { user, rows, coins } of perUser.values()) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: "survey",
          title: `We found ${coins} coins you were owed 🎉`,
          body: `${rows} reward(s) from ${partner} did not reach your balance because of a bug on our side. They are all there now — sorry for the wait!`,
        },
      });
    }
    console.log(`\ncredited ${paid} coins in total to ${perUser.size} account(s)`);
  }
} finally {
  await prisma.$disconnect();
}