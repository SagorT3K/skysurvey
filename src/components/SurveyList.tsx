"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CircleAlert,
  Clock,
  Coins,
  ExternalLink,
  LoaderCircle,
  Minimize2,
  ShieldCheck,
  Star,
  TriangleAlert,
  X,
} from "lucide-react";

export type SurveyCardData = {
  id: number | string;
  // Live router inventory: when set, Start goes through the per-user live API
  // instead of a Survey table row.
  liveProvider?: string;
  liveId?: string;
  title: string;
  category: string;
  loiMinutes: number;
  coins: number;
  usd?: number; // dollar value shown as the card's headline
  done: boolean;
  avgStars?: number | null; // community difficulty rating
  ratingCount?: number;
  completedCount?: number;
};

/**
 * Live routers give API surveys no return URL, and CPX sends no postback for
 * plain non-qualifications — so a new tab strands users on CPX's wall. Instead
 * the survey runs in a full-screen iframe ON our site (CPX's own script-tag
 * integration embeds the same wall), while the dashboard polls the attempt
 * status. The moment the provider's postback lands, the result card replaces
 * the iframe. Non-qualifications end when the user closes the survey frame.
 */
const STORAGE_KEY = "skysurvey.awaiting";
const POLL_MS = 5000;
const MAX_WAIT_MS = 45 * 60 * 1000;
const RESTORE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type Waiting = {
  txId: string;
  title: string;
  coins: number;
  usd?: number;
  loiMinutes: number;
  ts: number;
  // In-site survey frame; null once the user closes it (then we poll quietly).
  embedUrl?: string | null;
  hidden?: boolean; // minimized to a small pill
  timedOut?: boolean; // gave up polling, provider still silent
  result?: { status: "completed" | "screenout" | "reversed"; coins: number } | null;
};

function Stars({ avg }: { avg?: number | null }) {
  const filled = Math.round(avg ?? 0);
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={13}
          className={i <= filled ? "fill-amber-400 text-amber-400" : "fill-stone-200 text-stone-200"}
        />
      ))}
    </span>
  );
}

export default function SurveyList({ surveys }: { surveys: SurveyCardData[] }) {
  const router = useRouter();
  const [startingId, setStartingId] = useState<number | string | null>(null);
  const [selected, setSelected] = useState<SurveyCardData | null>(null);
  const [error, setError] = useState("");
  const [waiting, setWaiting] = useState<Waiting | null>(null);

  const updateWaiting = useCallback((fn: (w: Waiting) => Waiting) => {
    setWaiting((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      if (next) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else sessionStorage.removeItem(STORAGE_KEY);
      return next;
    });
  }, []);

  const clearWaiting = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setWaiting(null);
    router.refresh(); // refresh balance/ledger data behind the card
  }, [router]);

  // Resume a pending journey after back-navigation or a full page load.
  // sessionStorage is the external system here; useState's lazy initializer is
  // not enough because the component may remount on the same page load.
  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const w = JSON.parse(raw) as Waiting;
      if (!w.txId || Date.now() - w.ts > RESTORE_MAX_AGE_MS) {
        sessionStorage.removeItem(STORAGE_KEY);
        return;
      }
      // Defer the restore out of the effect body so it behaves like an
      // external-system subscription firing, not a synchronous render cascade.
      const id = requestAnimationFrame(() => setWaiting(w));
      return () => cancelAnimationFrame(id);
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Poll the attempt status until the provider's postback flips it.
  const txId = waiting?.txId;
  const finished = Boolean(waiting?.result || waiting?.timedOut);
  useEffect(() => {
    if (!txId || finished) return;
    let cancelled = false;
    const check = async () => {
      if (!txId || cancelled) return;
      try {
        const res = await fetch(`/api/attempts/tx/${txId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data.status || data.status === "started") return;

        updateWaiting((w) =>
          w.txId === txId
            ? { ...w, hidden: false, result: { status: data.status, coins: data.coins ?? 0 } }
            : w,
        );
        router.refresh();
      } catch {
        // network hiccup — next tick retries
      }
    };
    const timer = setInterval(() => {
      if (Date.now() - (waiting?.ts ?? Date.now()) > MAX_WAIT_MS) {
        updateWaiting((w) => (w.txId === txId ? { ...w, timedOut: true } : w));
        return;
      }
      check();
    }, POLL_MS);
    // First check right away: the postback may have beaten us here.
    const immediate = setTimeout(check, 800);
    return () => {
      cancelled = true;
      clearTimeout(immediate);
      clearInterval(timer);
    };
  }, [txId, finished, waiting?.ts, updateWaiting, router]);

  async function start(s: SurveyCardData) {
    setStartingId(s.id);
    setError("");
    const res = await fetch(
      s.liveProvider ? "/api/surveys/live/start" : `/api/surveys/${s.id}/start`,
      {
        method: "POST",
        ...(s.liveProvider
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ provider: s.liveProvider, externalId: s.liveId }),
            }
          : {}),
      },
    );
    const data = await res.json();
    setStartingId(null);
    if (!res.ok) {
      setError(data.error || "Could not start the survey");
      return;
    }
    setSelected(null);

    // Internal journeys (mock surveys) have their own feedback pages.
    const external = Boolean(data.external) || /^https?:\/\//i.test(data.redirect);
    if (!external) {
      router.push(data.redirect);
      return;
    }

    const w: Waiting = {
      txId: data.txId,
      title: s.title,
      coins: s.coins,
      usd: s.usd,
      loiMinutes: s.loiMinutes,
      ts: Date.now(),
      embedUrl: data.embedUrl ?? null,
      hidden: false,
    };

    // Embeddable providers (CPX) run inside our own iframe modal — the user
    // never leaves the site, so there is nothing to "come back" from.
    if (w.embedUrl) {
      updateWaiting(() => w);
      return;
    }

    // Fallback for non-embeddable providers: a real new tab (NO "noopener" —
    // that makes window.open return null, which silently fell back to
    // same-tab navigation and killed the poller).
    const win = window.open(data.redirect, "_blank");
    if (!win) {
      // Popup blocked — take the same tab; the journey resumes when the user
      // comes back (back button / router return).
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(w));
      router.push(data.redirect);
      return;
    }
    updateWaiting(() => w);
  }

  if (surveys.length === 0 && !waiting) {
    return (
      <div className="rounded-xl border border-dashed border-coffee-300 bg-white p-10 text-center text-stone-500">
        No surveys available for your country right now — check back soon.
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {surveys.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelected(s)}
            disabled={s.done}
            title={`${s.title} · ${s.category}`}
            aria-label={s.done ? `${s.title} (completed)` : `View ${s.title} details`}
            className="flex flex-col gap-1.5 rounded-xl border border-stone-200 bg-white p-4 text-left transition hover:border-coffee-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500">
              <Clock size={13} aria-hidden="true" />~{s.loiMinutes} min
            </span>
            {s.done ? (
              <span className="inline-flex items-center gap-1.5 text-lg font-bold text-stone-400">
                <Check size={18} aria-hidden="true" />
                Completed
              </span>
            ) : s.usd != null ? (
              <span className="text-xl font-bold text-emerald-700">
                ${s.usd.toFixed(2)}{" "}
                <span className="text-xs font-semibold text-stone-400">USD</span>
              </span>
            ) : (
              <span className="text-xl font-bold text-emerald-700">
                {s.coins}{" "}
                <span className="text-xs font-semibold text-stone-400">coins</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Stars avg={s.avgStars} />
              {s.ratingCount ? (
                <span className="text-xs text-stone-400">({s.ratingCount})</span>
              ) : null}
            </span>
            <span className="text-xs font-medium text-emerald-600">≈ {s.coins} coins</span>
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-3 inline-flex items-center gap-2 text-sm text-red-600">
          <TriangleAlert size={15} aria-hidden="true" />
          {error}
        </p>
      )}

      {/* Survey detail card — shown before anything starts: the grid card only
          opens this preview. */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${selected.title} details`}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="rounded-md bg-coffee-50 px-2 py-0.5 text-xs font-medium text-coffee-700">
                  {selected.category}
                </span>
                <h3 className="mt-2 text-lg font-bold leading-snug text-stone-900">
                  {selected.title}
                </h3>
              </div>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl bg-cream p-4">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600">
                <Clock size={15} className="text-stone-400" aria-hidden="true" />
                ~{selected.loiMinutes} min
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700">
                <Coins size={15} aria-hidden="true" />
                {selected.coins} coins
                {selected.usd != null && (
                  <span className="font-medium text-stone-400">(${selected.usd.toFixed(2)})</span>
                )}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Stars avg={selected.avgStars} />
                {selected.ratingCount ? (
                  <span className="text-xs text-stone-400">({selected.ratingCount})</span>
                ) : (
                  <span className="text-xs text-stone-400">No ratings yet</span>
                )}
              </span>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-stone-600">
              Answer a set of questions about your opinions and habits. Finish the survey to the
              end and the coins above are credited to your balance automatically — no need to
              claim anything.
            </p>
            <p className="mt-2 inline-flex items-start gap-1.5 text-xs text-stone-500">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
              Stay honest and consistent — low-quality or contradictory answers may not be
              credited by the research partner.
            </p>

            {error && (
              <p className="mt-3 inline-flex items-center gap-2 text-sm text-red-600">
                <TriangleAlert size={15} aria-hidden="true" />
                {error}
              </p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setSelected(null)}
                disabled={startingId === selected.id}
                className="flex-1 rounded-xl border border-stone-200 px-4 py-3 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Maybe later
              </button>
              <button
                onClick={() => start(selected)}
                disabled={startingId === selected.id}
                className="inline-flex flex-[2] items-center justify-center gap-2 rounded-xl bg-coffee-700 px-4 py-3 text-sm font-bold text-white hover:bg-coffee-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {startingId === selected.id ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                    Starting…
                  </>
                ) : (
                  "Start survey"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Waiting / result journey */}
      {waiting && waiting.hidden && !waiting.result && !waiting.timedOut && (
        <button
          onClick={() => updateWaiting((w) => ({ ...w, hidden: false }))}
          className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-coffee-800 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-coffee-900"
        >
          <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
          Checking survey…
        </button>
      )}

      {/* In-site survey frame: the router's wall (with our subid_1 and the
          deep-opened survey) runs on top of the dashboard, so the journey
          never leaves the site. Closing it just minimizes to the pill. */}
      {waiting && !waiting.hidden && waiting.embedUrl && !waiting.result && !waiting.timedOut && (
        <div className="fixed inset-0 z-50 flex flex-col bg-stone-900/70" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between gap-3 bg-coffee-900 px-4 py-2.5 text-white">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{waiting.title}</p>
              <p className="text-xs text-coffee-200">
                You&apos;re on SkySurvey — press Start inside, finish the survey in the window it
                opens, then come back here
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-300">
              <Coins size={14} aria-hidden="true" />
              {waiting.coins}
            </span>
            <button
              onClick={() => updateWaiting((w) => ({ ...w, hidden: true }))}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20"
            >
              <X size={15} aria-hidden="true" />
              Close
            </button>
          </div>
          <iframe src={waiting.embedUrl} title="Survey" className="w-full flex-1 bg-white" />
        </div>
      )}

      {/* Tab-mode fallback (non-embeddable providers) */}
      {waiting && !waiting.hidden && !waiting.embedUrl && !waiting.result && !waiting.timedOut && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => updateWaiting((w) => ({ ...w, hidden: true }))}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-6 text-center shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-coffee-100">
              <ExternalLink size={30} className="text-coffee-700" aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-xl font-bold text-stone-900">Survey opened</h3>
            <p className="mt-1 text-sm font-medium text-stone-500">{waiting.title}</p>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">
              Finish the survey in the tab that just opened. The moment you complete it — or get
              screened out — this page updates automatically.
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-stone-400">
              <Clock size={13} aria-hidden="true" />~{waiting.loiMinutes} min · keep this tab open
              while you answer
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => updateWaiting((w) => ({ ...w, hidden: true }))}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-stone-200 px-4 py-3 text-sm font-semibold text-stone-600 hover:bg-stone-50"
              >
                <Minimize2 size={15} aria-hidden="true" />
                Minimize
              </button>
              <button
                onClick={clearWaiting}
                className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-stone-400 hover:text-stone-600"
              >
                Stop checking
              </button>
            </div>
          </div>
        </div>
      )}

      {waiting?.embedUrl && waiting.hidden && !waiting.result && !waiting.timedOut && (
        <p className="mt-3 text-xs leading-relaxed text-stone-400">
          Survey window closed — we&apos;re still checking for the partner&apos;s confirmation.
          Completions usually confirm within a few minutes and the coins land automatically; if
          you didn&apos;t qualify, nothing is charged — just pick another survey.
        </p>
      )}

      {waiting && !waiting.hidden && (!!waiting.result || waiting.timedOut) && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-6 text-center shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {waiting.result?.status === "completed" ? (
              <>
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <Check size={32} className="text-emerald-600" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-xl font-bold text-stone-900">Survey completed!</h3>
                <p className="mt-2 text-sm text-stone-600">
                  <span className="text-lg font-bold text-emerald-700">
                    +{waiting.result.coins} coins
                  </span>{" "}
                  added to your balance
                  {waiting.usd != null && (
                    <span className="text-stone-400"> (${waiting.usd.toFixed(2)})</span>
                  )}
                  .
                </p>
              </>
            ) : waiting.result?.status === "screenout" ? (
              <>
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                  <CircleAlert size={32} className="text-amber-600" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-xl font-bold text-stone-900">Screened out this time</h3>
                <p className="mt-2 text-sm text-stone-600">
                  {waiting.result.coins > 0 ? (
                    <>
                      You still earned{" "}
                      <span className="font-bold text-emerald-700">
                        +{waiting.result.coins} bonus coin
                        {waiting.result.coins > 1 ? "s" : ""}
                      </span>{" "}
                      for your effort.
                    </>
                  ) : (
                    "No coins this time — fresh surveys land all the time, so keep going."
                  )}
                </p>
              </>
            ) : waiting.result?.status === "reversed" ? (
              <>
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <TriangleAlert size={32} className="text-red-600" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-xl font-bold text-stone-900">Completion reversed</h3>
                <p className="mt-2 text-sm text-stone-600">
                  The research partner reversed this survey, so its coins were withdrawn. Contact
                  support if you think this is a mistake.
                </p>
              </>
            ) : waiting.timedOut ? (
              <>
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
                  <Clock size={32} className="text-stone-500" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-xl font-bold text-stone-900">Still processing</h3>
                <p className="mt-2 text-sm text-stone-600">
                  The research partner hasn&apos;t confirmed yet. Coins land automatically the
                  moment it does — check your Rewards page in a few minutes.
                </p>
              </>
            ) : null}

            <div className="mt-6 flex gap-3">
              <button
                onClick={clearWaiting}
                className="w-full rounded-xl bg-coffee-700 px-4 py-3 text-sm font-bold text-white hover:bg-coffee-800"
              >
                {waiting.result ? "Back to surveys" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
