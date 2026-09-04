import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getConfig, setConfig } from "@/lib/config";

const ALLOWED_KEYS = [
  "site_name",
  "coin_rate_cents",
  "min_cashout_coins",
  "reward_share_percent",
  "signup_bonus_coins",
  "referral_bonus_coins",
  "daily_bonus_coins",
];

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await getConfig());
}

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Config entries object required" }, { status: 400 });
  }

  const entries: Record<string, string> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (!ALLOWED_KEYS.includes(k)) continue;
    const value = String(v).trim();
    if (k === "site_name") {
      if (!value) return NextResponse.json({ error: "Site name cannot be empty" }, { status: 400 });
    } else {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ error: `${k} must be a non-negative number` }, { status: 400 });
      }
    }
    entries[k] = value;
  }

  await setConfig(entries);
  return NextResponse.json({ ok: true, config: await getConfig() });
}
