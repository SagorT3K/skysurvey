/**
 * Replaces the admin password with a fresh random one and prints it once.
 *
 *   node scripts/neon-run.mjs scripts/tasks/reset-admin-password.mjs
 *
 * The seed falls back to a password published in this repository whenever
 * ADMIN_PASSWORD is unset, so any database seeded without it needs this before
 * being exposed.
 */
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const email = (process.env.ADMIN_EMAIL || "admin@skysurvey.com").toLowerCase();

// Ambiguous characters left out so the password survives being read off a screen.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const password = Array.from(crypto.randomFillSync(new Uint32Array(20)))
  .map((n) => ALPHABET[n % ALPHABET.length])
  .join("");

const admin = await prisma.user.findUnique({ where: { email } });
if (!admin) {
  console.error(`No account found for ${email}`);
  await prisma.$disconnect();
  process.exit(1);
}

await prisma.user.update({
  where: { id: admin.id },
  data: { passwordHash: await bcrypt.hash(password, 10) },
});

const [users, surveys, configs] = await Promise.all([
  prisma.user.count(),
  prisma.survey.count(),
  prisma.config.count(),
]);

console.log("\n----------------------------------------------------------");
console.log("  Admin password reset. Save it now, it is not stored.");
console.log(`  email    : ${email}`);
console.log(`  password : ${password}`);
console.log("----------------------------------------------------------");
console.log(`\nDatabase contents: ${users} user(s), ${surveys} survey(s), ${configs} config row(s)`);

await prisma.$disconnect();
