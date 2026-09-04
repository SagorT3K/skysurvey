import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Status = "active" | "held" | "blocked";

function statusOf(u: { isActive: boolean; heldUntil: Date | null }, now: Date): Status {
  if (!u.isActive) return "blocked";
  if (u.heldUntil && u.heldUntil.getTime() > now.getTime()) return "held";
  return "active";
}

const STATUS_STYLE: Record<Status, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-emerald-100 text-emerald-700" },
  held: { label: "On hold", cls: "bg-amber-100 text-amber-700" },
  blocked: { label: "Blocked", cls: "bg-red-100 text-red-600" },
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q = "", status: statusFilter = "all" } = await searchParams;
  const query = q.trim().toLowerCase();
  const now = new Date();

  const users = await prisma.user.findMany({
    where: { role: "user" },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { _count: { select: { attempts: true, redeems: true } } },
  });

  // Search matches username or email; filter narrows by account status.
  const matched = users.filter((u) => {
    const s = statusOf(u, now);
    const matchesQuery =
      !query ||
      u.username.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query);
    const matchesStatus = statusFilter === "all" || statusFilter === s;
    return matchesQuery && matchesStatus;
  });

  const counts = {
    all: users.length,
    active: users.filter((u) => statusOf(u, now) === "active").length,
    held: users.filter((u) => statusOf(u, now) === "held").length,
    blocked: users.filter((u) => statusOf(u, now) === "blocked").length,
  };

  const filters: { id: string; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.all },
    { id: "active", label: "Active", count: counts.active },
    { id: "held", label: "On hold", count: counts.held },
    { id: "blocked", label: "Blocked", count: counts.blocked },
  ];

  const filterLink = (id: string) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (id !== "all") params.set("status", id);
    const qs = params.toString();
    return `/admin/users${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <form className="flex gap-2">
          {statusFilter !== "all" && <input type="hidden" name="status" value={statusFilter} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by username or email..."
            className="w-64 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-sky-500"
          />
          <button className="rounded-lg bg-slate-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
            Search
          </button>
        </form>
      </div>

      {/* Status filters */}
      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((f) => {
          const activeFilter = statusFilter === f.id || (f.id === "all" && statusFilter === "all");
          const params = new URLSearchParams();
          if (query) params.set("q", query);
          if (f.id !== "all") params.set("status", f.id);
          const qs = params.toString();
          return (
            <Link
              key={f.id}
              href={filterLink(f.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                activeFilter
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-300 hover:ring-slate-400"
              }`}
            >
              {f.label}
              <span
                className={`ml-2 rounded-full px-1.5 py-0.5 text-xs ${
                  activeFilter ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                }`}
              >
                {f.count}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Country</th>
              <th className="px-5 py-3">Surveys</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Joined</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {matched.map((u) => {
              const s = statusOf(u, now);
              const style = STATUS_STYLE[s];
              return (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-800">{u.username || "—"}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </td>
                  <td className="px-5 py-3">{u.country || "—"}</td>
                  <td className="px-5 py-3">{u._count.attempts}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.cls}`}>
                      {style.label}
                    </span>
                    {u.isFlagged && (
                      <span className="ml-1.5 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                        flagged
                      </span>
                    )}
                    {s === "held" && u.heldUntil && (
                      <div className="mt-1 text-xs text-amber-600">
                        until {new Date(u.heldUntil).toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="inline-flex items-center gap-1 font-medium text-sky-600 hover:underline"
                    >
                      View
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {matched.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Showing {matched.length} of {users.length} users.
      </p>
    </div>
  );
}
