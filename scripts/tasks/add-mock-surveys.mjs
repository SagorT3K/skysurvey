/**
 * Adds a rotating pool of mock surveys so the dashboard can show fresh
 * surveys on every reload. Idempotent — surveys whose title already exists
 * (any country) are skipped, so it is safe to run repeatedly.
 *
 *   node scripts/tasks/add-mock-surveys.mjs            # against local SQLite
 *   node scripts/neon-run.mjs scripts/tasks/add-mock-surveys.mjs  # against Neon
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EXTRA_SURVEYS = [
  // US
  { title: "US Fast Food & Dining Out", category: "Consumer", cpiCents: 90, loiMinutes: 6, country: "US" },
  { title: "US Home Improvement Plans", category: "Home", cpiCents: 160, loiMinutes: 12, country: "US" },
  { title: "Streaming Wars: Who Wins 2026?", category: "Entertainment", cpiCents: 110, loiMinutes: 8, country: "US" },
  { title: "US Credit Card Rewards Study", category: "Finance", cpiCents: 210, loiMinutes: 15, country: "US" },
  { title: "Electric Vehicle Purchase Intent", category: "Automotive", cpiCents: 240, loiMinutes: 17, country: "US" },
  { title: "US Grocery Delivery Habits", category: "Shopping", cpiCents: 100, loiMinutes: 7, country: "US" },
  { title: "Fitness Apps & Wearables", category: "Health", cpiCents: 120, loiMinutes: 9, country: "US" },
  { title: "US Travel Booking Behavior", category: "Travel", cpiCents: 150, loiMinutes: 11, country: "US" },
  { title: "Online Banking Experience", category: "Finance", cpiCents: 170, loiMinutes: 12, country: "US" },
  { title: "US Coffee Shop Loyalty", category: "Consumer", cpiCents: 70, loiMinutes: 5, country: "US" },
  { title: "Smart Home Device Adoption", category: "Technology", cpiCents: 140, loiMinutes: 10, country: "US" },
  { title: "US Pet Insurance Awareness", category: "Consumer", cpiCents: 130, loiMinutes: 9, country: "US" },

  // UK
  { title: "UK High Street Shopping Revival", category: "Shopping", cpiCents: 100, loiMinutes: 8, country: "UK" },
  { title: "UK Rail & Commute Experience", category: "Travel", cpiCents: 120, loiMinutes: 9, country: "UK" },
  { title: "UK Energy Bills Sentiment", category: "Consumer", cpiCents: 150, loiMinutes: 11, country: "UK" },
  { title: "UK Football Fandom & Spending", category: "Entertainment", cpiCents: 90, loiMinutes: 7, country: "UK" },
  { title: "UK Pub & Dining Trends", category: "Consumer", cpiCents: 80, loiMinutes: 6, country: "UK" },

  // CA
  { title: "Canadian Winter Travel Plans", category: "Travel", cpiCents: 140, loiMinutes: 10, country: "CA" },
  { title: "CA Grocery Price Sensitivity", category: "Shopping", cpiCents: 100, loiMinutes: 8, country: "CA" },
  { title: "Canadian Hockey Streaming Habits", category: "Entertainment", cpiCents: 110, loiMinutes: 8, country: "CA" },
  { title: "CA Mobile Plan Switching", category: "Technology", cpiCents: 130, loiMinutes: 10, country: "CA" },

  // FR / DE / AU
  { title: "Enquête Livraison de Repas", category: "Consumer", cpiCents: 90, loiMinutes: 7, country: "FR" },
  { title: "Deutsche Elektroauto-Studie", category: "Automotive", cpiCents: 200, loiMinutes: 14, country: "DE" },
  { title: "Deutsche Nachhaltigkeit im Einkauf", category: "Shopping", cpiCents: 120, loiMinutes: 9, country: "DE" },
  { title: "Australia Renewable Energy Opinion", category: "Consumer", cpiCents: 140, loiMinutes: 10, country: "AU" },
  { title: "AU Online Sports Betting Views", category: "Entertainment", cpiCents: 110, loiMinutes: 8, country: "AU" },

  // ALL countries
  { title: "Social Media Screen Time", category: "Technology", cpiCents: 60, loiMinutes: 4, country: "ALL" },
  { title: "Remote Work Satisfaction", category: "Lifestyle", cpiCents: 100, loiMinutes: 8, country: "ALL" },
  { title: "Snack & Beverage Preferences", category: "Consumer", cpiCents: 70, loiMinutes: 5, country: "ALL" },
  { title: "Online Learning & Courses", category: "Education", cpiCents: 110, loiMinutes: 9, country: "ALL" },
  { title: "Sustainability & Packaging", category: "Consumer", cpiCents: 90, loiMinutes: 7, country: "ALL" },
  { title: "Gaming Platforms Battle", category: "Entertainment", cpiCents: 80, loiMinutes: 6, country: "ALL" },
  { title: "Crypto & Digital Wallets", category: "Finance", cpiCents: 160, loiMinutes: 12, country: "ALL" },
  { title: "Fashion & Secondhand Shopping", category: "Shopping", cpiCents: 90, loiMinutes: 7, country: "ALL" },
  { title: "Mental Health & Wellness Apps", category: "Health", cpiCents: 120, loiMinutes: 9, country: "ALL" },
  { title: "Food Delivery vs Home Cooking", category: "Consumer", cpiCents: 70, loiMinutes: 5, country: "ALL" },
  { title: "Smartphone Upgrade Cycle", category: "Technology", cpiCents: 140, loiMinutes: 11, country: "ALL" },
  { title: "Holiday Gifting Budget 2026", category: "Shopping", cpiCents: 100, loiMinutes: 8, country: "ALL" },
];

const existing = new Set(
  (await prisma.survey.findMany({ select: { title: true } })).map((s) => s.title),
);

let added = 0;
for (const s of EXTRA_SURVEYS) {
  if (existing.has(s.title)) continue;
  await prisma.survey.create({ data: { ...s, isActive: true } });
  added++;
}

const total = await prisma.survey.count();
console.log(`Added ${added} surveys (${EXTRA_SURVEYS.length - added} already existed). Total surveys now: ${total}`);
await prisma.$disconnect();
