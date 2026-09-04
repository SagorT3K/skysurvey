import { notFound } from "next/navigation";
import Link from "next/link";
import { Hourglass, ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import { getWalletSummary } from "@/lib/ledger";
import { relatedAccounts } from "@/lib/fraud";
import AdminUserActions from "@/components/admin/AdminUserActions";

export const dynamic = "force-dynamic";

function Demographics({ user }: { user: { [key: string]: string | undefined } }) {
  const rows: { label: string; value: string }[] = [
    { label: "Gender", value: user.gender || "" },
    { label: "Age group", value: user.ageGroup || "" },
    { label: "Ethnicity", value: user.ethnicity || "" },
    { label: "Education", value: user.education || "" },
    { label: "Household income", value: user.householdIncome || "" },
    { label: "Employment", value: user.employment || "" },
    { label: "State / region", value: user.state || "" },
    { label: "PayPal email", value: user.paypalEmail || "" },
  ];
  const filled = rows.filter((r) => r.value).length;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Self-reported demographics
        </h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            filled === rows.length ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {filled}/{rows.length} filled
        </span>
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-3 border-b border-slate-100 pb-1.5">
            <dt className="text-slate-500">{r.label}</dt>
            <dd className={`text-right font-medium ${r.value ? "text-slate-800" : "text-slate-300"}`}>
              {r.value || "not provided"}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-slate-400">
        Compare these against survey answers when a router disputes a response.
      </p>
    </div>
  );
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) notFound();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) notFound();

  const config = await getConfig();
  const [wallet, ledger, attempts, redeems, activity, siblings] = await Promise.all([
    getWalletSummary(user.id),
    prisma.coinTransaction.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.surveyAttempt.findMany({ where: { userId }, orderBy: { startedAt: "desc" }, take: 20, include: { survey: true } }),
    prisma.redeemRequest.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.activityLog.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 30 }),
    relatedAccounts(user.id, user.signupIp),
  ]);

  const started = await prisma.surveyAttempt.aggregate({ where: { userId }, _count: true });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{user.username || user.email}</h1>
          <p className="text-sm text-slate-500">
            {user.email} · {user.country || "unknown country"} · joined{" "}
            {new Date(user.createdAt).toLocaleDateString()} · ref code{" "}
            <code className="rounded bg-slate-200 px-1.5 py-0.5 text-xs">{user.referralCode}</code>
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Signup IP: {user.signupIp || "not recorded"}
          </p>
        </div>
        <AdminUserActions
          userId={user.id}
          isActive={user.isActive}
          isFlagged={user.isFlagged}
          heldUntil={user.heldUntil ? user.heldUntil.toISOString() : null}
        />
      </div>

      {user.heldUntil && new Date(user.heldUntil).getTime() > Date.now() && (
        <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="flex items-center gap-2 font-semibold text-amber-900">
            <Hourglass size={17} aria-hidden="true" />
            Account on hold until {new Date(user.heldUntil).toLocaleString()}
          </p>
          {user.holdReason && <p className="mt-1 text-sm text-amber-800">{user.holdReason}</p>}
        </div>
      )}

      {(user.isFlagged || siblings.length > 0) && (
        <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="flex items-center gap-2 font-semibold text-amber-900">
            <ShieldAlert size={17} aria-hidden="true" />
            {user.isFlagged ? "Account under fraud review — payouts blocked" : "Shared signup IP"}
          </p>
          {user.flagReason && <p className="mt-1 text-sm text-amber-800">{user.flagReason}</p>}
          {siblings.length > 0 && (
            <p className="mt-2 text-sm text-amber-800">
              Other accounts from {user.signupIp}:{" "}
              {siblings.map((s, i) => (
                <span key={s.id}>
                  {i > 0 && ", "}
                  <Link href={`/admin/users/${s.id}`} className="font-medium underline">
                    {s.email}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-4">
        {[
          { label: "Balance", value: `${wallet.balance}`, sub: `$${(wallet.balance * config.coin_rate_cents / 100).toFixed(2)}` },
          { label: "Withdrawable", value: `${wallet.withdrawable}`, sub: "ready to redeem" },
          { label: "Surveys started", value: started._count, sub: "lifetime" },
          { label: "Redemptions", value: redeems.length, sub: `${redeems.filter((r) => r.status === "paid").length} paid` },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">{c.label}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{c.value}</p>
            <p className="text-xs text-slate-400">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <Demographics
          user={{
            gender: user.gender,
            ageGroup: user.ageGroup,
            ethnicity: user.ethnicity,
            education: user.education,
            householdIncome: user.householdIncome,
            employment: user.employment,
            state: user.state,
            paypalEmail: user.paypalEmail,
          }}
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-bold text-slate-900">Coin ledger</h2>
          <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <tbody>
                {ledger.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5 capitalize">{t.category || t.type}</td>
                    <td className="px-4 py-2.5 text-slate-500">{t.description || "—"}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${t.coins >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {t.coins >= 0 ? "+" : ""}
                      {t.coins}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-slate-400">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {ledger.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500">No transactions.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold text-slate-900">Survey attempts</h2>
          <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5 text-slate-700">{a.survey.title}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          a.status === "completed" ? "bg-emerald-100 text-emerald-700" : a.status === "reversed" ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-slate-400">
                      {a.coinsCredited} coins · ${a.cpiCents / 100}
                    </td>
                  </tr>
                ))}
                {attempts.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500">No attempts yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <h2 className="mb-3 mt-6 text-lg font-bold text-slate-900">Activity trace</h2>
          <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 text-sm">
            {activity.length === 0 && <p className="text-center text-slate-500">No activity.</p>}
            <ul className="space-y-2">
              {activity.map((a) => (
                <li key={a.id} className="flex justify-between gap-3 border-b border-slate-100 pb-2 last:border-0">
                  <span>
                    <span className="font-medium text-slate-700">{a.event}</span>
                    <span className="text-slate-500"> {a.detail}</span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {a.ip} · {new Date(a.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
