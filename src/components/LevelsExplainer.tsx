import { TrendingDown, TrendingUp } from "lucide-react";

const EARN = [
  { what: "Daily check-in (once a day)", pts: "+2" },
  { what: "Completing a survey", pts: "+1" },
  { what: "A released (paid) redemption", pts: "+5" },
  { what: "Referral bonus — your invitee's first paid redemption", pts: "+5" },
  { what: "7-day active streak bonus", pts: "+10" },
];

const LOSE = [
  { what: "Missing a daily check-in (charged when you return)", pts: "−1" },
  { what: "A screened-out or kicked-out survey", pts: "−5" },
  { what: "A survey reversal by the research partner", pts: "−10" },
  { what: "An account hold (each time it is applied)", pts: "−50" },
];

const BENEFITS = [
  {
    title: "Bigger survey rewards",
    text: "Every level adds +2% on top of the base 70% survey rate. Level 3 pays 74%, level 5 pays 78% — automatically, on every survey.",
  },
  {
    title: "Priority cashouts",
    text: "Redeem requests are reviewed highest level first. Trusted members get released fastest.",
  },
  {
    title: "Visible trust badge",
    text: "Your level shows next to your name — a signal to our team that you are an established, reliable member.",
  },
];

export default function LevelsExplainer({ score }: { score: number }) {
  const level = Math.max(1, Math.floor(score / 100));
  return (
    <div>
      <p className="leading-relaxed text-slate-300">
        Your trust score starts at <b>100</b>. Every <b>100 points</b> is one level — reach{" "}
        <b>200</b> for Level 2, <b>300</b> for Level 3, and so on. You are currently{" "}
        <b>Level {level}</b> with <b>{score} points</b>. Levels are not permanent: good activity
        raises your score, rule-breaking lowers it.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-300">
            <TrendingUp size={16} aria-hidden="true" />
            How you earn points
          </p>
          <ul className="mt-3 space-y-2 text-sm text-emerald-200/90">
            {EARN.map((e) => (
              <li key={e.what} className="flex items-start justify-between gap-3">
                <span>{e.what}</span>
                <span className="shrink-0 font-bold text-emerald-300">{e.pts}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-red-300">
            <TrendingDown size={16} aria-hidden="true" />
            How you lose points
          </p>
          <ul className="mt-3 space-y-2 text-sm text-red-200/90">
            {LOSE.map((e) => (
              <li key={e.what} className="flex items-start justify-between gap-3">
                <span>{e.what}</span>
                <span className="shrink-0 font-bold text-red-300">{e.pts}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-slate-500">
        What your level does for you
      </h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {BENEFITS.map((b) => (
          <div key={b.title} className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
            <p className="font-semibold text-white">{b.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">{b.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
