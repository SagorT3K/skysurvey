/**
 * Rewrites the Prisma datasource provider in place.
 *
 * Prisma rejects env() for `provider`, so the one literal that differs between
 * environments is patched before generate / db push / build:
 *
 *   local      -> sqlite      (default, a file at prisma/dev.db)
 *   serverless -> postgresql  (Vercel's filesystem is read-only, so a hosted
 *                              database is the only option there)
 *
 * Set DATABASE_PROVIDER=postgresql in the deploy environment. Locally the script
 * is a no-op because sqlite is already the value in the committed schema.
 */
import { readFile, writeFile } from "node:fs/promises";

const SCHEMA = new URL("../prisma/schema.prisma", import.meta.url);
const SUPPORTED = ["sqlite", "postgresql", "mysql"];

const provider = (process.env.DATABASE_PROVIDER || "sqlite").trim();
if (!SUPPORTED.includes(provider)) {
  console.error(
    `set-db-provider: "${provider}" is not supported. Use one of: ${SUPPORTED.join(", ")}`,
  );
  process.exit(1);
}

const original = await readFile(SCHEMA, "utf8");
const patched = original.replace(
  /(datasource\s+db\s*\{[^}]*?provider\s*=\s*)"[^"]+"/,
  `$1"${provider}"`,
);

if (patched === original) {
  console.log(`set-db-provider: already "${provider}", nothing to change`);
} else {
  await writeFile(SCHEMA, patched);
  console.log(`set-db-provider: datasource provider set to "${provider}"`);
}
