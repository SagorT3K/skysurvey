"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("ss_cookie_consent")) setVisible(true);
  }, []);

  function decide(choice: "all" | "essential") {
    localStorage.setItem("ss_cookie_consent", choice);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-coffee-300 bg-white p-4 shadow-[0_-4px_24px_rgba(0,0,0,0.12)]">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-3 sm:flex-row sm:items-center">
        <p className="flex-1 text-sm text-stone-700">
          We use cookies to keep SkySurvey working, measure traffic, and prevent fraud. See our{" "}
          <Link href="/cookies" className="font-semibold text-coffee-700 underline">
            Cookie Policy
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-semibold text-coffee-700 underline">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => decide("essential")}
            className="rounded-lg border border-coffee-300 px-4 py-2 text-sm font-medium text-coffee-800 hover:bg-coffee-50"
          >
            Essential only
          </button>
          <button
            onClick={() => decide("all")}
            className="rounded-lg bg-coffee-700 px-4 py-2 text-sm font-semibold text-white hover:bg-coffee-800"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
