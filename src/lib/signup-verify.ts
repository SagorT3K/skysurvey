import crypto from "node:crypto";
import { promises as dns } from "node:dns";

/**
 * Signup email verification: the six-digit code, its storage, and the cheap
 * domain checks that keep obvious junk addresses out before we send anything.
 */

/** Six digits from a CSPRNG — never Math.random, a guessable code is no code. */
export function newCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

/** The plain code is never stored: only a keyed hash of it reaches the database. */
export function hashCode(email: string, code: string) {
  const secret =
    process.env.VERIFY_CODE_SECRET || process.env.JWT_SECRET || "dev-secret-change-me";
  return crypto.createHash("sha256").update(`${secret}:${email.trim().toLowerCase()}:${code}`).digest("hex");
}

/** Constant-time comparison of the submitted code against the stored hash. */
export function codeMatches(email: string, code: string, storedHash: string) {
  const a = Buffer.from(hashCode(email, code));
  const b = Buffer.from(storedHash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Domains that exist only to receive throwaway mail. Short on purpose: the emailed
// code is what proves the address is real, this only filters the obvious.
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "sharklasers.com",
  "10minutemail.com",
  "tempmail.com",
  "temp-mail.org",
  "trashmail.com",
  "yopmail.com",
  "getnada.com",
  "dispostable.com",
  "maildrop.cc",
  "throwawaymail.com",
  "fakeinbox.com",
  "mailnesia.com",
  "spam4.me",
]);

const mxCache = new Map<string, boolean>();

/**
 * Does the domain actually accept mail? A missing MX record is the cheapest way to
 * reject "asdfgh.com" before a code is sent, and the answer is cached per instance.
 *
 * A DNS failure that is not "this domain has no records" (blocked resolver, a
 * timeout) passes: our own lookup problem must never lock real users out.
 */
export async function domainAcceptsMail(email: string) {
  const domain = email.split("@")[1]?.toLowerCase().trim() ?? "";
  if (!domain) return false;
  if (DISPOSABLE_DOMAINS.has(domain)) return false;

  const cached = mxCache.get(domain);
  if (cached !== undefined) return cached;

  try {
    const records = await dns.resolveMx(domain);
    const ok = records.length > 0;
    mxCache.set(domain, ok);
    return ok;
  } catch (error) {
    const code = (error as { code?: string }).code ?? "";
    const noMailRecords = code === "ENOTFOUND" || code === "ENODATA";
    if (noMailRecords) mxCache.set(domain, false);
    else console.warn(`[signup] MX lookup for ${domain} failed (${code}) — allowing it`);
    return !noMailRecords;
  }
}

/** The email the user sees. Kept plain-text friendly and short. */
export function verificationEmail(code: string, ttlMinutes: number) {
  const text =
    `Your SkySurvey verification code is ${code}.\n\n` +
    `Enter it on the sign-up page to finish creating your account. The code expires in ${ttlMinutes} minutes.\n\n` +
    `If you did not sign up for SkySurvey, you can ignore this email — no account has been created.`;
  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f5f5f4;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#1c1917">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:28px">
      <h1 style="margin:0 0 8px;font-size:20px">Confirm your email</h1>
      <p style="margin:0 0 20px;color:#57534e;font-size:14px">Enter this code on the sign-up page to finish creating your SkySurvey account.</p>
      <p style="margin:0 0 20px;font-size:34px;font-weight:700;letter-spacing:8px">${code}</p>
      <p style="margin:0;color:#78716c;font-size:13px">The code expires in ${ttlMinutes} minutes. If you did not sign up, you can ignore this email — no account has been created.</p>
    </div>
  </body>
</html>`;
  return { text, html };
}
