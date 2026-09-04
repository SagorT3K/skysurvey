import { getConfig } from "@/lib/config";
import ConfigForm from "@/components/admin/ConfigForm";

export const dynamic = "force-dynamic";

export default async function AdminConfigPage() {
  const config = await getConfig();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Economy and reward rules for the whole platform. Changes apply immediately.
      </p>
      <div className="mt-6">
        <ConfigForm initial={config} />
      </div>
    </div>
  );
}
