"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopyReferralLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const el = document.createElement("textarea");
      el.value = link;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <code className="flex-1 overflow-x-auto rounded-lg bg-white/5 px-3 py-2 text-sm font-semibold text-brand-200 ring-1 ring-white/10">
        {link}
      </code>
      <button
        onClick={copy}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-900/40 hover:shadow-brand-700/40"
      >
        {copied ? (
          <>
            <Check size={15} aria-hidden="true" />
            Copied!
          </>
        ) : (
          <>
            <Copy size={15} aria-hidden="true" />
            Copy link
          </>
        )}
      </button>
    </div>
  );
}
