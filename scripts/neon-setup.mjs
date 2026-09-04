/**
 * One-time Neon setup: create the tables, then seed config, admin and demo surveys.
 *
 *   node scripts/neon-setup.mjs
 *
 * Reads credentials from .env.neon and never prints them. The Prisma client is
 * provider-specific, so this generates a Postgres client, does the work, then
 * regenerates the SQLite client — otherwise local development would be left
 * pointing at a client that can only speak Postgres.
 */
import { execSync } from "node:child_process";
import { config } from "dotenv";

config({ path: ".env.neon" });

const required = ["DATABASE_PROVIDER", "DATABASE_URL", "DATABASE_URL_UNPOOLED"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing in .env.neon: ${missing.join(", ")}`);
  process.exit(1);
}

// execSync runs through a shell on purpose: since Node 18.20 spawning a Windows
// .cmd shim such as npx.cmd without one fails with EINVAL.
const run = (command, env = {}) =>
  execSync(command, { stdio: "inherit", env: { ...process.env, ...env } });

function setProvider(provider) {
  run("node scripts/set-db-provider.mjs", { DATABASE_PROVIDER: provider });
}

let failed = false;
try {
  console.log("\n=== 1/4 switching schema to postgresql ===");
  setProvider("postgresql");

  console.log("\n=== 2/4 generating the Postgres client ===");
  run("npx prisma generate");

  console.log("\n=== 3/4 creating tables in Neon ===");
  run("npx prisma db push --skip-generate");

  console.log("\n=== 4/4 seeding config, admin and demo surveys ===");
  run("node prisma/seed.js");
} catch (error) {
  failed = true;
  console.error(`\nFAILED: ${error.message}`);
} finally {
  // Always hand local development back a working SQLite client.
  console.log("\n=== restoring the local sqlite setup ===");
  try {
    setProvider("sqlite");
    run("npx prisma generate");
  } catch (error) {
    console.error(`Could not restore sqlite: ${error.message}`);
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
