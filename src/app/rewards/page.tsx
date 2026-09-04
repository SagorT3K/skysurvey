import { redirect } from "next/navigation";
import { ArrowRight, ShieldAlert, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isHeld, holdDurationLeft } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { getWalletSummary } from "@/lib/ledger";
import { methodLabel } from "@/lib/redeem";
import RedeemForm from "@/components/RedeemForm";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";

export const dynamic = "force-dynamic";

export default async function RewardsPage() {
  const user = await getSessionUser();
  if (!user || user.role === "admin") redirect("/login");

  const config = await getConfig();
  const wallet = await getWalletSummary(user.id);
  const held = isHeld(user);
  const holdLeft = holdDurationLeft(user);

  const [ledger, allRedeems] = await Promise.all([
    prisma.coinTransaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 25 }),
    prisma.redeemRequest.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
  ]);

  // Number requests per user (their 1st request is #1), oldest first.
  const seqOf = new Map([...allRedeems].reverse().map((r, i) => [r.id, i + 1]));
  const redeems = allRedeems.slice(0, 5);

  return (
    <main className="flex min-h-screen flex-1 flex-col bg-cream">
      <AppHeader active="rewards" balance={wallet.balance} />

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-8 lg:grid-cols-[1fr_380px]">
        <div>
          {held && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
              <ShieldAlert size={22} className="mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-bold">Sorry, you can&apos;t earn right now.</p>
                <p className="mt-1 text-sm">
                  Your account has been held for {holdLeft}. Earning and redeeming are paused; you
                  can still review your history and activities below.
                </p>
              </div>
            </div>
          )}
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
                          #{seqOf.get(r.id)} · {r.coins} coins
                          <ArrowRight size={14} className="text-coffee-400" aria-hidden="true" />
                          ${(r.amountCents / 100).toFixed(2)}
                        </span>
                        <span className="block text-xs font-normal text-stone-400">
                          {methodLabel(r.method)} → {r.destination}
                        </span>
                        <span className="block text-xs font-normal text-stone-400">
                          Requested {r.createdAt.toLocaleString("en-US")}
                          {r.status === "paid" && r.processedAt &&
                            ` · Released ${r.processedAt.toLocaleString("en-US")}`}
                        </span>
                      </td>
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
                          {r.status === "paid" ? "Success" : r.status === "pending" ? "Pending" : r.status}
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
            {held ? (
              <p className="mt-2 text-xs font-semibold opacity-90">
                Redemption is disabled while your account is on hold.
              </p>
            ) : (
              <p className="mt-2 text-xs opacity-80">
                Requests are reviewed by our team and released after verification.
              </p>
            )}
          </div>
          <div className="mt-6">
            {held ? (
              <div className="rounded-xl border border-dashed border-red-300 bg-white p-5 text-center text-sm text-red-700">
                Redeeming is paused while your account is on hold. Your history below stays
                available.
              </div>
            ) : (
              <RedeemForm
                withdrawable={wallet.withdrawable}
                minCoins={config.min_cashout_coins}
                coinRateCents={config.coin_rate_cents}
                defaultEmail={user.paypalEmail || user.email}
              />
            )}
          </div>
        </aside>
      </div>

      <AppFooter variant="app" />
    </main>
  );
}
