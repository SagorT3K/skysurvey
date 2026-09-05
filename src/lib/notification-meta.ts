import { Bell, Coins, Gift, TrendingDown, TrendingUp, Trophy, UserPlus, Wallet } from "lucide-react";

// Shared notification type → icon/color mapping, used by the bell popup and
// the full notifications page.
export const TYPE_META: Record<string, { icon: typeof Bell; cls: string }> = {
  survey: { icon: Coins, cls: "bg-emerald-100 text-emerald-700" },
  screenout: { icon: TrendingDown, cls: "bg-red-100 text-red-600" },
  coins: { icon: TrendingUp, cls: "bg-emerald-100 text-emerald-700" },
  referral: { icon: UserPlus, cls: "bg-sky-100 text-sky-700" },
  payout: { icon: Wallet, cls: "bg-coffee-100 text-coffee-800" },
  voucher: { icon: Gift, cls: "bg-purple-100 text-purple-700" },
  crypto: { icon: Coins, cls: "bg-orange-100 text-orange-700" },
  level: { icon: Trophy, cls: "bg-amber-100 text-amber-700" },
  hold: { icon: TrendingDown, cls: "bg-red-100 text-red-600" },
  system: { icon: Bell, cls: "bg-slate-100 text-slate-600" },
};
