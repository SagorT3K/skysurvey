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
    <main className="flex min-h-screen flex-1 flex-col bg-cream">
      <AppHeader active="surveys" balance={wallet.balance} />

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-coffee-900">
          <Bell size={24} className="text-coffee-600" aria-hidden="true" />
          Notifications
        </h1>
        <p className="mt-1 text-stone-600">
          Earnings, referrals, payouts and account updates — all in one place.
        </p>

        <div className="mt-6 space-y-2.5">
          {items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-coffee-300 bg-white p-10 text-center text-stone-500">
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
                className={`flex items-start gap-3 rounded-2xl border bg-white p-4 ${
                  !n.read ? "border-coffee-300 shadow-sm" : "border-coffee-100"
                }`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.cls}`}>
                  <Icon size={17} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold text-coffee-900">
                    {n.title}
                    {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" aria-label="new" />}
                  </p>
                  {n.body && <p className="mt-0.5 text-sm text-stone-600">{n.body}</p>}
                  <p className="mt-1 text-xs text-stone-400">{new Date(n.createdAt).toLocaleString()}</p>
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
