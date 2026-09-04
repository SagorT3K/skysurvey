/**
 * Rewrites the Prisma datasource block in place.
 *
 * Prisma rejects env() for `provider`, so the parts that differ between
 * environments are patched before generate / db push / build:
 *
 *   local      -> sqlite      (default, a file at prisma/dev.db)
 *   serverless -> postgresql  (Vercel's filesystem is read-only, so a hosted
 *                              database is the only option there)
 *
 * Postgres also gets `directUrl`. On Neon the app must use the pooled connection
 * string, because serverless functions open many short-lived connections, but
 * schema operations such as `prisma db push` require a direct one. Keeping
 * directUrl out of the sqlite block matters: Prisma fails outright when a
 * referenced environment variable is missing.
 *
 * Set DATABASE_PROVIDER=postgresql in the deploy environment. Locally the script
 * is a no-op because sqlite is already what the committed schema says.
 */
import { readFile, writeFile } from "node:fs/promises";

const SCHEMA = new URL("../prisma/schema.prisma", import.meta.url);

const BLOCKS = {
  sqlite: `datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}`,
  postgresql: `datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DATABASE_URL_UNPOOLED")
}`,
  mysql: `datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}`,
};

const provider = (process.env.DATABASE_PROVIDER || "sqlite").trim();
if (!Object.hasOwn(BLOCKS, provider)) {
  console.error(
    `set-db-provider: "${provider}" is not supported. Use one of: ${Object.keys(BLOCKS).join(", ")}`,
  );
  process.exit(1);
}

const original = await readFile(SCHEMA, "utf8");
const datasource = /datasource\s+db\s*\{[^}]*\}/;
if (!datasource.test(original)) {
  console.error("set-db-provider: could not find a `datasource db { ... }` block");
  process.exit(1);
}

const patched = original.replace(datasource, BLOCKS[provider]);
if (patched === original) {
  console.log(`set-db-provider: already "${provider}", nothing to change`);
} else {
  await writeFile(SCHEMA, patched);
  console.log(`set-db-provider: datasource set to "${provider}"`);
}
