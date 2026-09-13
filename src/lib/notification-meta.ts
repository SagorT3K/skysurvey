import { Bell, Coins, Gift, TrendingDown, TrendingUp, Trophy, UserPlus, Wallet } from "lucide-react";

// Shared notification type → icon/color mapping, used by the bell popup and
// the full notifications page.
export const TYPE_META: Record<string, { icon: typeof Bell; cls: string }> = {
  survey: { icon: Coins, cls: "bg-emerald-500/15 text-emerald-300" },
  screenout: { icon: TrendingDown, cls: "bg-red-500/15 text-red-300" },
  coins: { icon: TrendingUp, cls: "bg-emerald-500/15 text-emerald-300" },
  referral: { icon: UserPlus, cls: "bg-brand-500/15 text-brand-300" },
  payout: { icon: Wallet, cls: "bg-brand-500/15 text-brand-300" },
  voucher: { icon: Gift, cls: "bg-fuchsia-500/15 text-fuchsia-300" },
  crypto: { icon: Coins, cls: "bg-amber-500/15 text-amber-300" },
  level: { icon: Trophy, cls: "bg-amber-500/15 text-amber-300" },
  hold: { icon: TrendingDown, cls: "bg-red-500/15 text-red-300" },
  system: { icon: Bell, cls: "bg-white/10 text-slate-300" },
};
