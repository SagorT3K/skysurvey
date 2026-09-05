import crypto from "node:crypto";

/**
 * Router / survey-aggregator integration layer.
 *
 * Every provider (TrayiStats, CPX Research, BitLabs, ...) uses its own parameter
 * names, signature scheme and status codes, so nothing is hard-coded here: each
 * provider is described entirely by environment variables and this module turns
 * that description into an entry URL and a normalised postback.
 *
 * Set PROVIDERS to a comma-separated list of keys, then for each key KEY define:
 *   PROVIDER_KEY_LABEL          display name (optional)
 *   PROVIDER_KEY_PUBLISHER_ID   publisher / vendor id the router assigned you
 *   PROVIDER_KEY_API_KEY        API key for fetching the survey list
 *   PROVIDER_KEY_SECRET         shared secret used to sign postbacks
 *   PROVIDER_KEY_ENTRY_URL      entry template, e.g.
 *                               https://router.example/start?pub={publisherId}&uid={userId}&tx={txId}
 *   PROVIDER_KEY_ENTRY_HASH_MODE      none | md5 | sha1 | sha256 | hmac-sha256 (default none)
 *   PROVIDER_KEY_ENTRY_HASH_TEMPLATE  what gets hashed into {entryHash} in the entry
 *                               URL (default {userId}-{secret}). CPX Research, for
 *                               example, wants secure_hash=md5(extUserId-secureHash).
 *   PROVIDER_KEY_SIG_MODE       none | md5 | sha1 | sha256 | hmac-sha256 (default none)
 *   PROVIDER_KEY_SIG_PARAM      query param carrying the signature (default hash)
 *   PROVIDER_KEY_SIG_TEMPLATE   what gets hashed, e.g. {txId}{payout}{secret}
 *   PROVIDER_KEY_P_TXID         postback param holding our txId (default txId)
 *   PROVIDER_KEY_P_PAYOUT       postback param holding the payout (default payout)
 *   PROVIDER_KEY_P_STATUS       postback param holding the status (default status)
 *   PROVIDER_KEY_PAYOUT_UNIT    usd | cents (default usd)
 *   PROVIDER_KEY_STATUS_OK      values meaning "completed" (default 1,complete,completed)
 *   PROVIDER_KEY_STATUS_REVERSE values meaning "reversal"  (default 2,reversal,reversed,chargeback)
 *   PROVIDER_KEY_STATUS_SCREEN  values meaning "screenout" (default 3,screenout,disqualified)
 *   PROVIDER_KEY_IP_ALLOWLIST   optional comma-separated postback source IPs
 *
 * Take the exact names from the router's own integration docs — a wrong mapping
 * silently drops completions, so verify against a test postback before going live.
 */

export type SignatureMode = "none" | "md5" | "sha1" | "sha256" | "hmac-sha256";

export type ProviderDef = {
  key: string;
  label: string;
  publisherId: string;
  apiKey: string;
  secret: string;
  entryUrl: string;
  entryHashMode: SignatureMode;
  entryHashTemplate: string;
  signatureMode: SignatureMode;
  signatureParam: string;
  signatureTemplate: string;
  paramTxId: string;
  paramPayout: string;
  paramStatus: string;
  payoutUnit: "usd" | "cents";
  statusOk: string[];
  statusReverse: string[];
  statusScreenout: string[];
  ipAllowlist: string[];
};

function env(key: string, fallback = "") {
  return (process.env[key] ?? "").trim() || fallback;
}

function list(value: string) {
  return value
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

function envPrefix(key: string) {
  return `PROVIDER_${key.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
}

const SIG_MODES: string[] = ["none", "md5", "sha1", "sha256", "hmac-sha256"];

function parseMode(value: string): SignatureMode {
  const mode = value.toLowerCase();
  return SIG_MODES.includes(mode) ? (mode as SignatureMode) : "none";
}

/** Digests `base` with `mode`, keying an HMAC with the provider secret. */
function digest(mode: SignatureMode, secret: string, base: string): string {
  return mode === "hmac-sha256"
    ? crypto.createHmac("sha256", secret).update(base).digest("hex")
    : crypto.createHash(mode).update(base).digest("hex");
}

export function getProvider(key: string): ProviderDef | null {
  const normalized = key.toLowerCase();
  if (!list(env("PROVIDERS")).includes(normalized)) return null;

  const p = envPrefix(normalized);
  const entryUrl = env(`${p}_ENTRY_URL`);
  if (!entryUrl) return null;

  const mode = env(`${p}_SIG_MODE`, "none").toLowerCase() as SignatureMode;
  // For an HMAC the secret is the key, so it must not also sit inside the message;
  // for a plain digest the shared secret is what makes the hash unforgeable.
  const defaultTemplate = mode === "hmac-sha256" ? "{txId}{payout}" : "{txId}{payout}{secret}";
  return {
    key: normalized,
    label: env(`${p}_LABEL`, normalized),
    publisherId: env(`${p}_PUBLISHER_ID`),
    apiKey: env(`${p}_API_KEY`),
    secret: env(`${p}_SECRET`),
    entryUrl,
    entryHashMode: parseMode(env(`${p}_ENTRY_HASH_MODE`, "none")),
    entryHashTemplate: env(`${p}_ENTRY_HASH_TEMPLATE`, "{userId}-{secret}"),
    signatureMode: parseMode(mode),
    signatureParam: env(`${p}_SIG_PARAM`, "hash"),
    signatureTemplate: env(`${p}_SIG_TEMPLATE`, defaultTemplate),
    paramTxId: env(`${p}_P_TXID`, "txId"),
    paramPayout: env(`${p}_P_PAYOUT`, "payout"),
    paramStatus: env(`${p}_P_STATUS`, "status"),
    payoutUnit: env(`${p}_PAYOUT_UNIT`, "usd") === "cents" ? "cents" : "usd",
    statusOk: list(env(`${p}_STATUS_OK`, "1,complete,completed")),
    statusReverse: list(env(`${p}_STATUS_REVERSE`, "2,reversal,reversed,chargeback")),
    statusScreenout: list(env(`${p}_STATUS_SCREEN`, "3,screenout,disqualified")),
    ipAllowlist: list(env(`${p}_IP_ALLOWLIST`)),
  };
}

export function listProviders(): ProviderDef[] {
  return list(env("PROVIDERS"))
    .map(getProvider)
    .filter((p): p is ProviderDef => p !== null);
}

type TemplateVars = Record<string, string>;

function fill(template: string, vars: TemplateVars) {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => vars[name] ?? "");
}

export function buildEntryUrl(
  provider: ProviderDef,
  vars: { txId: string; userId: number; surveyId: number; externalId: string; country: string; ip: string },
) {
  const urlVars: TemplateVars = {
    publisherId: provider.publisherId,
    apiKey: provider.apiKey,
    txId: vars.txId,
    userId: String(vars.userId),
    surveyId: String(vars.surveyId),
    externalId: vars.externalId,
    country: vars.country,
    ip: vars.ip,
  };

  // Some routers (CPX Research) want a per-user digest in the entry URL itself.
  // The secret is only ever fed to the hash, never to the URL template, so a
  // stray {secret} in ENTRY_URL cannot leak it into a user-visible redirect.
  if (provider.entryHashMode !== "none") {
    const base = fill(provider.entryHashTemplate, { ...urlVars, secret: provider.secret });
    urlVars.entryHash = digest(provider.entryHashMode, provider.secret, base);
  }

  return fill(provider.entryUrl, urlVars);
}

/** Recomputes the router's signature and compares it in constant time. */
export function verifySignature(provider: ProviderDef, query: URLSearchParams): boolean {
  if (provider.signatureMode === "none") return true;
  if (!provider.secret) return false;

  const supplied = query.get(provider.signatureParam) || "";
  if (!supplied) return false;

  const vars: TemplateVars = { secret: provider.secret, publisherId: provider.publisherId };
  for (const [k, v] of query.entries()) vars[k] = v;
  vars.txId = query.get(provider.paramTxId) || "";
  vars.payout = query.get(provider.paramPayout) || "";
  vars.status = query.get(provider.paramStatus) || "";

  const base = fill(provider.signatureTemplate, vars);
  const expected = digest(provider.signatureMode, provider.secret, base);

  const a = Buffer.from(expected.toLowerCase());
  const b = Buffer.from(supplied.toLowerCase());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export type PostbackKind = "complete" | "reversal" | "screenout" | "unknown";

export type ParsedPostback = {
  txId: string;
  kind: PostbackKind;
  payoutCents: number;
  rawStatus: string;
};

/** Maps a router's own parameter names and status codes onto our internal shape. */
export function parsePostback(provider: ProviderDef, query: URLSearchParams): ParsedPostback {
  const rawStatus = (query.get(provider.paramStatus) || "").trim();
  const status = rawStatus.toLowerCase();

  const kind: PostbackKind = provider.statusOk.includes(status)
    ? "complete"
    : provider.statusReverse.includes(status)
      ? "reversal"
      : provider.statusScreenout.includes(status)
        ? "screenout"
        : "unknown";

  const rawPayout = Number((query.get(provider.paramPayout) || "0").replace(/[^0-9.\-]/g, ""));
  const payout = Number.isFinite(rawPayout) ? Math.abs(rawPayout) : 0;

  return {
    txId: (query.get(provider.paramTxId) || "").trim(),
    kind,
    payoutCents: Math.round(provider.payoutUnit === "cents" ? payout : payout * 100),
    rawStatus,
  };
}

export function ipAllowed(provider: ProviderDef, ip: string) {
  if (provider.ipAllowlist.length === 0) return true;
  return provider.ipAllowlist.includes(ip.toLowerCase());
}



