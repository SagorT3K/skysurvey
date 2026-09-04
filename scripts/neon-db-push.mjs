/**
 * Pushes the current Prisma schema to the Neon database (new columns/tables
 * only — never drops data), then restores the local SQLite client.
 *
 *   node scripts/neon-db-push.mjs
 */
import { execSync } from "node:child_process";
import { config } from "dotenv";

config({ path: ".env.neon" });
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL missing from .env.neon");
  process.exit(1);
}

const run = (command, env = {}) =>
  execSync(command, { stdio: "inherit", env: { ...process.env, ...env } });

let failed = false;
try {
  run("node scripts/set-db-provider.mjs", { DATABASE_PROVIDER: "postgresql" });
  run("npx prisma db push --skip-generate");
  run("npx prisma generate");
} catch (error) {
  failed = true;
  console.error(`FAILED: ${error.message}`);
} finally {
  try {
    run("node scripts/set-db-provider.mjs", { DATABASE_PROVIDER: "sqlite" });
    run("npx prisma generate");
  } catch (error) {
    console.error(`Could not restore sqlite: ${error.message}`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
