import { prisma } from "./prisma";

export type SiteConfig = {
  site_name: string;
  coin_rate_cents: number;
  min_cashout_coins: number;
  reward_share_percent: number;
  hold_days: number;
  signup_bonus_coins: number;
  referral_bonus_coins: number;
  daily_bonus_coins: number;
  max_attempts_per_hour: number;
  max_accounts_per_ip: number;
};

const DEFAULTS: Record<string, string> = {
  site_name: "SkySurvey",
  coin_rate_cents: "1",
  min_cashout_coins: "500",
  reward_share_percent: "70",
  hold_days: "7",
  signup_bonus_coins: "100",
  referral_bonus_coins: "50",
  daily_bonus_coins: "10",
  max_attempts_per_hour: "20",
  max_accounts_per_ip: "2",
};

export async function getConfig(): Promise<SiteConfig> {
  const rows = await prisma.config.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const merged = { ...DEFAULTS, ...map };
  return {
    site_name: merged.site_name,
    coin_rate_cents: Number(merged.coin_rate_cents),
    min_cashout_coins: Number(merged.min_cashout_coins),
    reward_share_percent: Number(merged.reward_share_percent),
    hold_days: Number(merged.hold_days),
    signup_bonus_coins: Number(merged.signup_bonus_coins),
    referral_bonus_coins: Number(merged.referral_bonus_coins),
    daily_bonus_coins: Number(merged.daily_bonus_coins),
    max_attempts_per_hour: Number(merged.max_attempts_per_hour),
    max_accounts_per_ip: Number(merged.max_accounts_per_ip),
  };
}

export async function setConfig(entries: Record<string, string>) {
  for (const [key, value] of Object.entries(entries)) {
    await prisma.config.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
}
