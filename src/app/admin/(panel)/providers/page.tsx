import Link from "next/link";
import { CheckCircle2, CircleDashed, Plug } from "lucide-react";
import { listProviders } from "@/lib/providers";

export const dynamic = "force-dynamic";

// Well-known router signup pages — exact param names come from each router's
// publisher docs after signup. BitLabs needs 50k+ MAU (see PROVIDERS-SETUP.md);
// the others are self-serve with no traffic minimum.
const KNOWN: Record<string, { name: string; signup: string }> = {
  cpx: {
    name: "CPX Research",
    signup: "https://publisher.cpx-research.com/index.php?page=register",
  },
  torox: { name: "Torox (OfferToro)", signup: "https://torox.io/register/" },
  inbrain: { name: "inBrain.ai", signup: "https://publisher.inbrain.ai/account/signup" },
  theoremreach: {
    name: "TheoremReach",
    signup: "https://publishers.theoremreach.com/sign_up",
  },
  adgate: { name: "AdGate Media", signup: "https://dash.adgatemedia.com/account/signup" },
  trayistats: { name: "TrayiStats", signup: "https://trayi.co/" },
  bitlabs: { name: "BitLabs (needs 50k+ MAU)", signup: "https://www.bitlabs.ai/" },
};

export default function AdminProvidersPage() {
  const providers = listProviders();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://skysurvey.vercel.app";

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
        <Plug size={20} aria-hidden="true" />
        Survey providers
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        Routers listed in the <code className="rounded bg-slate-200 px-1">PROVIDERS</code> env var
        with an entry URL appear here. Each one needs the postback URL below set in its publisher
        dashboard.
      </p>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-semibold text-slate-800">Postback URL</p>
        <p className="mt-1 text-xs text-slate-500">
          Give this to every router (replace <code>:provider</code> with the provider key below):
        </p>
        <p className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-emerald-300">
          {baseUrl}/api/postback/:provider
        </p>
      </div>

      {providers.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No providers configured yet. Set{" "}
          <code className="rounded bg-slate-200 px-1">PROVIDERS=bitlabs</code> and the matching{" "}
          <code className="rounded bg-slate-200 px-1">PROVIDER_BITLABS_*</code> vars in Vercel, then
          reload. See <code className="rounded bg-slate-200 px-1">PROVIDERS-SETUP.md</code> in the
          repo for step-by-step signup instructions.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {providers.map((p) => {
            const known = KNOWN[p.key];
            // CPX needs no API key: its survey-list API authenticates with
            // app_id + secure_hash, which the SECRET already covers.
            const needsApiKey = p.key !== "cpx";
            const miss: string[] = [];
            if (!p.publisherId) miss.push("PUBLISHER_ID");
            if (!p.apiKey && needsApiKey) miss.push("API_KEY");
            if (!p.secret) miss.push("SECRET");
            return (
              <div key={p.key} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {known?.name ?? p.label}{" "}
                      <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-500">
                        {p.key}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Signature: {p.signatureMode} · IP allowlist:{" "}
                      {p.ipAllowlist.length > 0 ? "yes" : "no"}
                    </p>
                  </div>
                  {miss.length === 0 ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 size={14} aria-hidden="true" /> Ready
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      <CircleDashed size={14} aria-hidden="true" /> Missing {miss.join(", ")}
                    </span>
                  )}
                </div>
                {known && (
                  <a
                    href={known.signup}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-xs font-semibold text-coffee-700 hover:underline"
                  >
                    Publisher dashboard →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-xs text-slate-400">
        After adding a provider on Vercel: create the survey rows (import or seed), then send a test
        postback and confirm it shows under Router postbacks.
      </p>
      <Link
        href="/admin/postbacks"
        className="mt-2 inline-block text-xs font-semibold text-coffee-700 hover:underline"
      >
        View router postbacks →
      </Link>
    </div>
  );
}
