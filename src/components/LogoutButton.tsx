"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white"
    >
      <LogOut size={15} aria-hidden="true" />
      Log out
    </button>
  );
}
