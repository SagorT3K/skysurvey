/**
 * Runs an arbitrary Prisma task against the Neon database.
 *
 *   node scripts/neon-run.mjs <script.mjs|script.js>
 *
 * The Prisma client is provider-specific, so this generates a Postgres client,
 * runs the given script, then regenerates the SQLite client so local development
 * is left working. Credentials come from .env.neon and are never printed.
 */
import { execSync } from "node:child_process";
import { config } from "dotenv";

config({ path: ".env.neon" });

const task = process.argv[2];
if (!task) {
  console.error("Usage: node scripts/neon-run.mjs <script>");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing from .env.neon");
  process.exit(1);
}

// execSync goes through a shell on purpose: since Node 18.20, spawning a Windows
// .cmd shim such as npx.cmd without one fails with EINVAL.
const run = (command, env = {}) =>
  execSync(command, { stdio: "inherit", env: { ...process.env, ...env } });

let failed = false;
try {
  run("node scripts/set-db-provider.mjs", { DATABASE_PROVIDER: "postgresql" });
  run("npx prisma generate");
  run(`node ${task}`);
} catch (error) {
  failed = true;
  console.error(`\nFAILED: ${error.message}`);
} finally {
  console.log("\n=== restoring the local sqlite client ===");
  try {
    run("node scripts/set-db-provider.mjs", { DATABASE_PROVIDER: "sqlite" });
    run("npx prisma generate");
  } catch (error) {
    console.error(`Could not restore sqlite: ${error.message}`);
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
