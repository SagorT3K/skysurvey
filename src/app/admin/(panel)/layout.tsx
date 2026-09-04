import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Radio, Receipt, ShieldCheck, SlidersHorizontal, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import AppFooter from "@/components/AppFooter";
import LogoutButton from "@/components/LogoutButton";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/redeems", label: "Redeem requests", icon: Receipt },
  { href: "/admin/postbacks", label: "Router postbacks", icon: Radio },
  { href: "/admin/config", label: "Settings", icon: SlidersHorizontal },
];

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 flex-col bg-slate-900 p-5 text-slate-300 md:flex">
          <Link href="/admin" className="mb-8 flex items-center gap-2.5 font-bold text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-coffee-600 text-white">
              <ShieldCheck size={17} strokeWidth={2.25} aria-hidden="true" />
            </span>
            SkySurvey Admin
          </Link>
          <nav className="space-y-1 text-sm">
            {NAV.map(({ icon: Icon, ...n }) => (
              <Link
                key={n.href}
                href={n.href}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-slate-800 hover:text-white"
              >
                <Icon size={16} aria-hidden="true" />
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto pt-6 text-xs text-slate-500">
            Signed in as <span className="text-slate-300">{admin.email}</span>
            <div className="mt-2">
              <LogoutButton />
            </div>
          </div>
        </aside>
        <div className="flex-1 p-6 md:p-8">{children}</div>
      </div>
      <AppFooter />
    </div>
  );
}
