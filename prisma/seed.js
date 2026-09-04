const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const DEFAULT_CONFIG = {
  site_name: "SkySurvey",
  coin_rate_cents: "1", // 1 coin = $0.01
  min_cashout_coins: "500", // 500 coins = $5
  reward_share_percent: "70", // user gets 70% of router CPI in coins
  hold_days: "7", // survey coins held this many days before withdrawable
  signup_bonus_coins: "100",
  referral_bonus_coins: "50",
  daily_bonus_coins: "10",
};

const MOCK_SURVEYS = [
  { title: "Consumer Shopping Habits 2026", category: "Shopping", cpiCents: 150, loiMinutes: 12, country: "US" },
  { title: "Streaming Services Preferences", category: "Entertainment", cpiCents: 100, loiMinutes: 8, country: "US" },
  { title: "Healthcare Experience Feedback", category: "Healthcare", cpiCents: 250, loiMinutes: 18, country: "US" },
  { title: "UK Grocery & Retail Survey", category: "Shopping", cpiCents: 120, loiMinutes: 10, country: "UK" },
  { title: "UK Banking & Finance Opinion", category: "Finance", cpiCents: 180, loiMinutes: 14, country: "UK" },
  { title: "Canadian Telecom Usage Study", category: "Technology", cpiCents: 130, loiMinutes: 11, country: "CA" },
  { title: "Auto Insurance Decision Journey", category: "Finance", cpiCents: 220, loiMinutes: 16, country: "US" },
  { title: "Enquête Consommateurs France", category: "Shopping", cpiCents: 110, loiMinutes: 9, country: "FR" },
  { title: "Travel & Vacation Planning", category: "Travel", cpiCents: 90, loiMinutes: 7, country: "ALL" },
  { title: "Mobile Apps & Games Habits", category: "Technology", cpiCents: 60, loiMinutes: 5, country: "ALL" },
  { title: "Pet Food & Care Products", category: "Consumer", cpiCents: 80, loiMinutes: 6, country: "ALL" },
  { title: "Energy Provider Switching Study", category: "Consumer", cpiCents: 200, loiMinutes: 15, country: "ALL" },
];

async function main() {
  for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
    await prisma.config.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  const adminEmail = "admin@skysurvey.com";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash("Admin@123", 10),
        username: "Admin",
        role: "admin",
      },
    });
    console.log("Admin created:", adminEmail, "/ Admin@123");
  }

  const surveyCount = await prisma.survey.count();
  if (surveyCount === 0) {
    await prisma.survey.createMany({ data: MOCK_SURVEYS.map((s) => ({ ...s, provider: "mock" })) });
    console.log(`Seeded ${MOCK_SURVEYS.length} mock surveys`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
