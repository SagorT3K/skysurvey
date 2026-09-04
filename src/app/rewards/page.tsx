import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Coins, Hourglass, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { getWalletSummary } from "@/lib/ledger";
import { methodLabel } from "@/lib/redeem";
import RedeemForm from "@/components/RedeemForm";
import LogoutButton from "@/components/LogoutButton";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function RewardsPage() {
  const user = await getSessionUser();
  if (!user || user.role === "admin") redirect("/login");

  const config = await getConfig();
  const wallet = await getWalletSummary(user.id);

  const [ledger, redeems] = await Promise.all([
    prisma.coinTransaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 25 }),
    prisma.redeemRequest.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  return (
    <main className="flex-1 bg-cream">
      <header className="sticky top-0 z-40 border-b border-coffee-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo href="/dashboard" size="sm" />
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/dashboard" className="rounded-lg px-3 py-1.5 font-medium text-stone-600 hover:bg-coffee-100">
              Surveys
            </Link>
            <Link href="/rewards" className="rounded-lg px-3 py-1.5 font-medium text-coffee-800 hover:bg-coffee-100">
              Rewards
            </Link>
            <span className="mx-2 hidden items-center gap-1.5 rounded-lg bg-coffee-100 px-3 py-1.5 font-semibold text-coffee-800 sm:flex">
              <Coins size={16} aria-hidden="true" />
              {wallet.balance}
            </span>
            <LogoutButton />
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1fr_380px]">
        <div>
          <h1 className="text-2xl font-bold text-coffee-900">Redeem coins</h1>
          <p className="mt-1 text-stone-600">
            1 coin = ${(config.coin_rate_cents / 100).toFixed(2)} · minimum cashout{" "}
            {config.min_cashout_coins} coins (${((config.min_cashout_coins * config.coin_rate_cents) / 100).toFixed(2)}).
          </p>

          <h2 className="mt-8 text-lg font-bold text-coffee-900">Redeem history</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-coffee-200 bg-white">
            {redeems.length === 0 ? (
              <p className="p-6 text-center text-stone-500">No redemption requests yet.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {redeems.map((r) => (
                    <tr key={r.id} className="border-b border-coffee-100 last:border-0">
                      <td className="px-5 py-3 font-medium text-stone-700">
                        <span className="inline-flex items-center gap-2">
                          #{r.id} · {r.coins} coins
                          <ArrowRight size={14} className="text-coffee-400" aria-hidden="true" />
                          ${(r.amountCents / 100).toFixed(2)}
                        </span>
                        <span className="block text-xs font-normal text-stone-400">
                          {methodLabel(r.method)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-stone-500">{r.destination}</td>
                      <td className="px-5 py-3 text-right">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            r.status === "paid"
                              ? "bg-emerald-100 text-emerald-700"
                              : r.status === "rejected"
                                ? "bg-red-100 text-red-600"
                                : r.status === "approved"
                                  ? "bg-coffee-100 text-coffee-700"
                                  : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <h2 className="mt-8 text-lg font-bold text-coffee-900">Coin ledger</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-coffee-200 bg-white">
            {ledger.length === 0 ? (
              <p className="p-6 text-center text-stone-500">Nothing here yet.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {ledger.map((t) => (
                    <tr key={t.id} className="border-b border-coffee-100 last:border-0">
                      <td className="px-5 py-3 capitalize text-stone-700">
                        {t.category || t.type}
                      </td>
                      <td className="px-5 py-3 text-stone-500">{t.description || "—"}</td>
                      <td className="px-5 py-3 text-right font-semibold">
                        <span className={t.coins >= 0 ? "text-emerald-600" : "text-red-600"}>
                          {t.coins >= 0 ? "+" : ""}
                          {t.coins}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-stone-400">
                        {t.availableAt > new Date() ? "on hold" : "available"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-coffee-200 bg-white p-6 shadow-sm">
          <div className="rounded-xl bg-emerald-50 p-4 text-emerald-800">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Wallet size={15} aria-hidden="true" />
              Withdrawable now
            </p>
            <p className="mt-1 text-2xl font-bold">{wallet.withdrawable}</p>
            <p className="text-sm">${((wallet.withdrawable * config.coin_rate_cents) / 100).toFixed(2)}</p>
            {wallet.pending > 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-xs opacity-80">
                <Hourglass size={13} aria-hidden="true" />
                +{wallet.pending} coins on hold (7-day validation)
              </p>
            )}
          </div>
          <div className="mt-6">
            <RedeemForm
              withdrawable={wallet.withdrawable}
              minCoins={config.min_cashout_coins}
              coinRateCents={config.coin_rate_cents}
              defaultEmail={user.paypalEmail || user.email}
            />
          </div>
        </aside>
      </div>
    </main>
  );
}
