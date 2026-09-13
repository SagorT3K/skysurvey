import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getWalletSummary } from "@/lib/ledger";
import { TYPE_META } from "@/lib/notification-meta";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getSessionUser();
  if (!user || user.role === "admin") redirect("/login");

  const wallet = await getWalletSummary(user.id);

  // Visiting the page clears the badge — the list itself keeps everything.
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
  ]);
  if (unread > 0) {
    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
  }

  return (
    <main className="app-dark flex min-h-screen flex-1 flex-col">
      <AppHeader active="surveys" balance={wallet.balance} />

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <Bell size={24} className="text-brand-300" aria-hidden="true" />
          Notifications
        </h1>
        <p className="mt-1 text-slate-400">
          Earnings, referrals, payouts and account updates — all in one place.
        </p>

        <div className="mt-6 space-y-2.5">
          {items.length === 0 && (
            <div className="glass rounded-2xl border-dashed p-10 text-center text-slate-400">
              Nothing here yet. Complete your first survey and your notifications will show up
              here.
            </div>
          )}
          {items.map((n) => {
            const meta = TYPE_META[n.type] ?? TYPE_META.system;
            const Icon = meta.icon;
            return (
              <div
                key={n.id}
                className={`glass flex items-start gap-3 rounded-2xl p-4 ${
                  !n.read ? "!border-brand-400/40 shadow-lg shadow-brand-950/40" : "!border-white/5"
                }`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.cls}`}>
                  <Icon size={17} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold text-white">
                    {n.title}
                    {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" aria-label="new" />}
                  </p>
                  {n.body && <p className="mt-0.5 text-sm text-slate-400">{n.body}</p>}
                  <p className="mt-1 text-xs text-slate-500">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AppFooter variant="app" />
    </main>
  );
}
