/**
 * Sends one test message through Brevo with the sender the app is configured to
 * use, so a sender change or a fresh API key can be checked without creating an
 * account (and without touching the database).
 *
 *   npm run mail:test -- you@example.com
 *   node scripts/mail-test.mjs you@example.com
 *
 * Reads .env only; .env.neon is a database file and is never loaded here. The API
 * key is reported as present/absent — it is never printed.
 */
import { config } from "dotenv";

config({ path: ".env" });

const to = (process.argv[2] || "").trim();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
  console.error("Usage: node scripts/mail-test.mjs <recipient@example.com>");
  process.exit(1);
}

const apiKey = (process.env.BREVO_API_KEY || "").trim();
const fromEmail = (process.env.MAIL_FROM_EMAIL || "").trim();
const fromName = (process.env.MAIL_FROM_NAME || "SkySurvey").trim();

if (!apiKey) {
  console.error("BREVO_API_KEY is missing from .env — add it before testing.");
  process.exit(1);
}
if (!fromEmail) {
  console.error(
    "MAIL_FROM_EMAIL is missing from .env — set it to the Brevo-verified sender,\n" +
      'for example MAIL_FROM_EMAIL="skysurvey.support@gmail.com".',
  );
  process.exit(1);
}

console.log(`From: "${fromName} <${fromEmail}>"`);
console.log(`To:   ${to}`);
console.log(`BREVO_API_KEY: present (${apiKey.length} characters, not printed)\n`);

let failed = false;
try {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: fromEmail, name: fromName },
      to: [{ email: to }],
      subject: "SkySurvey test email",
      textContent:
        "This is a test message from the SkySurvey mailer. Nothing was created and " +
        "no account was touched — you can ignore it.",
      htmlContent:
        "<p>This is a test message from the SkySurvey mailer. Nothing was created and " +
        "no account was touched — you can ignore it.</p>",
    }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await res.text();
  if (!res.ok) {
    failed = true;
    console.error(`Brevo rejected the send (HTTP ${res.status}): ${body.slice(0, 300)}`);
    if (res.status === 401) console.error("401 usually means the API key is wrong or revoked.");
    if (res.status === 400) {
      console.error(
        `400 usually means the sender is not verified in Brevo (or is blocked). Verify\n${fromEmail} at app.brevo.com -> Senders, Domains & IPs -> Senders.`,
      );
    }
  } else {
    console.log(`Brevo accepted the send: ${body.slice(0, 200)}`);
    console.log(`Open ${to} — the From line should read ${fromEmail}.`);
  }
} catch (error) {
  failed = true;
  console.error("Could not reach the Brevo API:", error.message);
}

process.exit(failed ? 1 : 0);