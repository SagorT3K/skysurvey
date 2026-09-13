"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Check,
  CircleAlert,
  Clock,
  Coins,
  Coffee,
  ExternalLink,
  Gamepad2,
  Globe2,
  HeartPulse,
  Laptop,
  LoaderCircle,
  Minimize2,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sprout,
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
 * Survey journey: clicking Start claims a real new window synchronously inside
 * the click gesture (a window.open after an await gets popup-blocked), sends it
 * to the provider's survey URL, and this page stays behind as the home base.
 * A poller watches the attempt until the provider's postback flips it — then
 * the survey window closes, focus returns to the dashboard, and the result
 * card pops automatically. Non-qualifications send no postback, so those just
 * end when the user closes the survey window.
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
  // The survey URL, kept so the "Open survey" button can re-open it (popup
  // blockers eat the first window.open, and a reload drops the handle).
  // embedUrl is a legacy iframe-mode value kept only for restored sessions.
  url?: string | null;
  embedUrl?: string | null;
  hidden?: boolean; // minimized to a small pill
  timedOut?: boolean; // gave up polling, provider still silent
  result?: { status: "completed" | "screenout" | "reversed"; coins: number } | null;
};

// Decorative category tiles — each card gets a deterministic gradient icon
// so the board looks varied and lively, matching the category mood.
const CATEGORIES: { icon: LucideIcon; grad: string }[] = [
  { icon: ShoppingBag, grad: "from-violet-400 to-brand-700" },
  { icon: Smartphone, grad: "from-sky-300 to-indigo-600" },
  { icon: HeartPulse, grad: "from-rose-300 to-fuchsia-600" },
  { icon: Coffee, grad: "from-amber-300 to-orange-600" },
  { icon: Gamepad2, grad: "from-teal-300 to-emerald-600" },
  { icon: Globe2, grad: "from-cyan-300 to-blue-700" },
  { icon: Laptop, grad: "from-fuchsia-300 to-purple-700" },
  { icon: Sprout, grad: "from-lime-300 to-green-600" },
];

function categoryTile(id: string | number): { icon: LucideIcon; grad: string } {
  const key = String(id);
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 997;
  return CATEGORIES[h % CATEGORIES.length];
}

function Stars({ avg }: { avg?: number | null }) {
  const filled = Math.round(avg ?? 0);
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={13}
          className={i <= filled ? "fill-amber-400 text-amber-400" : "fill-white/15 text-white/15"}
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

  // The provider survey window (null when blocked or after a reload).
  const winRef = useRef<Window | null>(null);

  // Browsers ignore focus() calls made from a background tab, so when the
  // postback lands while the user is inside the survey window we also flash
  // this tab's title — that's what actually pulls them back to the dashboard.
  const baseTitle = useRef("SkySurvey");
  useEffect(() => {
    baseTitle.current = document.title;
    return () => {
      document.title = baseTitle.current;
    };
  }, []);
  const result = waiting?.result;
  useEffect(() => {
    if (!result) return;
    document.title =
      result.status === "completed"
        ? `✓ +${result.coins} coins — SkySurvey`
        : result.status === "screenout"
          ? "✓ Survey checked — SkySurvey"
          : "Survey checked — SkySurvey";
    return () => {
      document.title = baseTitle.current;
    };
  }, [result]);

  // Re-open the survey window from a fresh click gesture — this is the
  // fallback when the first window.open was popup-blocked or the page was
  // reloaded while the survey was still running.
  function reopenSurvey() {
    const url = waiting?.url ?? waiting?.embedUrl;
    if (!url) return;
    const win = window.open(url, "_blank");
    if (win) winRef.current = win;
  }

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
        // Journey over — bring the user back from the survey window so the
        // result card pops right in front of them.
        try {
          winRef.current?.close();
        } catch {
          // window already gone — nothing to close
        }
        winRef.current = null;
        window.focus();
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
    // Instant re-check when the user comes back to this tab — postbacks often
    // land while they're still inside the survey window.
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearTimeout(immediate);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [txId, finished, waiting?.ts, updateWaiting, router]);

  async function start(s: SurveyCardData) {
    setStartingId(s.id);
    setError("");
    // Claim the survey window synchronously inside the click gesture. A
    // window.open after awaiting the start API loses the popup blocker's
    // good graces and silently returns null — the exact bug that made surveys
    // never open. about:blank first, real URL right after the response.
    const win = window.open("about:blank", "_blank");
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
      win?.close();
      setError(data.error || "Could not start the survey");
      return;
    }
    setSelected(null);

    // Internal journeys (mock surveys) have their own feedback pages.
    const external = Boolean(data.external) || /^https?:\/\//i.test(data.redirect);
    if (!external) {
      win?.close();
      router.push(data.redirect);
      return;
    }

    const url: string = data.redirect || data.embedUrl || "";
    const w: Waiting = {
      txId: data.txId,
      title: s.title,
      coins: s.coins,
      usd: s.usd,
      loiMinutes: s.loiMinutes,
      ts: Date.now(),
      url,
      hidden: false,
    };

    if (!win) {
      // Popup blocked — park the journey; the overlay's "Open survey" button
      // re-attempts with its own click gesture, which the blocker allows.
      updateWaiting(() => w);
      return;
    }
    winRef.current = win;
    win.location.href = url;
    updateWaiting(() => w);
  }

  if (surveys.length === 0 && !waiting) {
    return (
      <div className="glass rounded-2xl border-dashed p-10 text-center text-slate-400">
        No surveys available for your country right now — check back soon.
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {surveys.map((s) => {
          const { icon: CatIcon, grad } = categoryTile(s.id);
          const starting = startingId === s.id;
          return (
            <div
              key={s.id}
              role="button"
              tabIndex={0}
              onClick={() => !s.done && setSelected(s)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelected(s);
                }
              }}
              title={`${s.title} · ${s.category}`}
              aria-label={s.done ? `${s.title} (completed)` : `View ${s.title} details`}
              className="glass glass-hover flex cursor-pointer flex-col rounded-2xl p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300">
                  <Clock size={12} aria-hidden="true" />~{s.loiMinutes} min
                </span>
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),0_10px_24px_rgba(0,0,0,0.35)] ${grad}`}
                  aria-hidden="true"
                >
                  <CatIcon size={22} />
                </span>
              </div>

              {s.done ? (
                <span className="mt-2 inline-flex items-center gap-1.5 text-lg font-bold text-slate-400">
                  <Check size={18} aria-hidden="true" />
                  Completed
                </span>
              ) : s.usd != null ? (
                <p className="mt-2 text-2xl font-extrabold tracking-tight text-white">
                  ${s.usd.toFixed(2)}{" "}
                  <span className="text-xs font-semibold text-slate-400">USD</span>
                </p>
              ) : (
                <p className="mt-2 text-2xl font-extrabold tracking-tight text-white">
                  {s.coins}{" "}
                  <span className="text-xs font-semibold text-slate-400">coins</span>
                </p>
              )}
              <p className="mt-0.5 truncate text-sm font-medium text-slate-200" title={s.title}>
                {s.title}
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <Stars avg={s.avgStars} />
                {s.ratingCount ? (
                  <span className="text-xs text-slate-500">({s.ratingCount})</span>
                ) : null}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                  <Coins size={13} aria-hidden="true" />≈ {s.coins} coins
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!s.done && !starting) start(s);
                  }}
                  disabled={s.done || starting}
                  className="rounded-lg border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white transition hover:border-brand-400/60 hover:bg-brand-600/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {starting ? (
                    <>
                      <LoaderCircle size={13} className="mr-1 inline animate-spin" aria-hidden="true" />
                      Starting…
                    </>
                  ) : (
                    "Start Survey"
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {error && (
        <p className="mt-3 inline-flex items-center gap-2 text-sm text-red-400">
          <TriangleAlert size={15} aria-hidden="true" />
          {error}
        </p>
      )}

      {/* Survey detail card — shown before anything starts: the grid card only
          opens this preview. */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${selected.title} details`}
        >
          <div
            className="glass w-full max-w-md rounded-t-2xl bg-[#14112b]/90 p-6 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-medium text-brand-200">
                  {selected.category}
                </span>
                <h3 className="mt-2 text-lg font-bold leading-snug text-white">
                  {selected.title}
                </h3>
              </div>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-white/10 bg-white/5 p-4">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-300">
                <Clock size={15} className="text-slate-500" aria-hidden="true" />
                ~{selected.loiMinutes} min
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-400">
                <Coins size={15} aria-hidden="true" />
                {selected.coins} coins
                {selected.usd != null && (
                  <span className="font-medium text-slate-500">(${selected.usd.toFixed(2)})</span>
                )}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Stars avg={selected.avgStars} />
                {selected.ratingCount ? (
                  <span className="text-xs text-slate-400">({selected.ratingCount})</span>
                ) : (
                  <span className="text-xs text-slate-400">No ratings yet</span>
                )}
              </span>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              Answer a set of questions about your opinions and habits. Finish the survey to the
              end and the coins above are credited to your balance automatically — no need to
              claim anything.
            </p>
            <p className="mt-2 inline-flex items-start gap-1.5 text-xs text-slate-400">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden="true" />
              Stay honest and consistent — low-quality or contradictory answers may not be
              credited by the research partner.
            </p>

            {error && (
              <p className="mt-3 inline-flex items-center gap-2 text-sm text-red-400">
                <TriangleAlert size={15} aria-hidden="true" />
                {error}
              </p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setSelected(null)}
                disabled={startingId === selected.id}
                className="flex-1 rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Maybe later
              </button>
              <button
                onClick={() => start(selected)}
                disabled={startingId === selected.id}
                className="btn-shine inline-flex flex-[2] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-brand-900/50 transition hover:shadow-brand-700/50 disabled:cursor-not-allowed disabled:opacity-60"
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
          className="glass fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
        >
          <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
          Checking survey…
        </button>
      )}

      {/* Survey window home base: the survey runs in its own window; this
          overlay stays on the dashboard and the poller swaps in the result
          card automatically the moment the postback lands. "Open survey"
          covers popup-blocked first attempts and page reloads. */}
      {waiting && !waiting.hidden && !waiting.result && !waiting.timedOut && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => updateWaiting((w) => ({ ...w, hidden: true }))}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="glass w-full max-w-md rounded-t-2xl bg-[#14112b]/90 p-6 text-center shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="icon-tile mx-auto flex h-16 w-16 items-center justify-center rounded-full">
              <ExternalLink size={30} className="text-white" aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-xl font-bold text-white">Survey opened</h3>
            <p className="mt-1 text-sm font-medium text-slate-400">{waiting.title}</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Finish the survey in the window that just opened. When it ends, the research partner
              shows a short confirmation page — just leave it be. Within a few minutes we detect
              your result automatically, close that window and bring you back here with your
              reward.
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-400">
              <Clock size={13} aria-hidden="true" />~{waiting.loiMinutes} min · keep this page open
              while you answer
            </p>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Want another survey? Come back here and pick a fresh card — surveys started from the
              partner&apos;s own list can&apos;t be tracked for rewards.
            </p>
            <div className="mt-6 space-y-3">
              {(waiting.url || waiting.embedUrl) && (
                <button
                  onClick={reopenSurvey}
                  className="btn-shine inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-brand-900/50 hover:shadow-brand-700/50"
                >
                  <ExternalLink size={15} aria-hidden="true" />
                  Open survey
                </button>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => updateWaiting((w) => ({ ...w, hidden: true }))}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5"
                >
                  <Minimize2 size={15} aria-hidden="true" />
                  Minimize
                </button>
                <button
                  onClick={clearWaiting}
                  className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 hover:text-slate-300"
                >
                  Stop checking
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {waiting && waiting.hidden && !waiting.result && !waiting.timedOut && (
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          Survey window closed — we&apos;re still checking for the partner&apos;s confirmation.
          Completions usually confirm within a few minutes and the coins land automatically; if
          you didn&apos;t qualify, nothing is charged — just pick another survey.
        </p>
      )}

      {waiting && !waiting.hidden && (!!waiting.result || waiting.timedOut) && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="glass w-full max-w-md rounded-t-2xl bg-[#14112b]/90 p-6 text-center shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {waiting.result?.status === "completed" ? (
              <>
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/40">
                  <Check size={32} className="text-emerald-400" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-xl font-bold text-white">Survey completed!</h3>
                <p className="mt-2 text-sm text-slate-300">
                  <span className="text-lg font-bold text-emerald-400">
                    +{waiting.result.coins} coins
                  </span>{" "}
                  added to your balance
                  {waiting.usd != null && (
                    <span className="text-slate-500"> (${waiting.usd.toFixed(2)})</span>
                  )}
                  .
                </p>
              </>
            ) : waiting.result?.status === "screenout" ? (
              <>
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 ring-1 ring-amber-400/40">
                  <CircleAlert size={32} className="text-amber-400" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-xl font-bold text-white">Screened out this time</h3>
                <p className="mt-2 text-sm text-slate-300">
                  {waiting.result.coins > 0 ? (
                    <>
                      You still earned{" "}
                      <span className="font-bold text-emerald-400">
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
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 ring-1 ring-red-400/40">
                  <TriangleAlert size={32} className="text-red-400" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-xl font-bold text-white">Completion reversed</h3>
                <p className="mt-2 text-sm text-slate-300">
                  The research partner reversed this survey, so its coins were withdrawn. Contact
                  support if you think this is a mistake.
                </p>
              </>
            ) : waiting.timedOut ? (
              <>
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                  <Clock size={32} className="text-slate-400" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-xl font-bold text-white">Still processing</h3>
                <p className="mt-2 text-sm text-slate-300">
                  The research partner hasn&apos;t confirmed yet. Coins land automatically the
                  moment it does — check your Rewards page in a few minutes.
                </p>
              </>
            ) : null}

            <div className="mt-6 flex gap-3">
              <button
                onClick={clearWaiting}
                className="btn-shine w-full rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-brand-900/50 hover:shadow-brand-700/50"
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
