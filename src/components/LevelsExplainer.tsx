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
      <p className="leading-relaxed text-stone-600">
        Your trust score starts at <b>100</b>. Every <b>100 points</b> is one level — reach{" "}
        <b>200</b> for Level 2, <b>300</b> for Level 3, and so on. You are currently{" "}
        <b>Level {level}</b> with <b>{score} points</b>. Levels are not permanent: good activity
        raises your score, rule-breaking lowers it.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-800">
            <TrendingUp size={16} aria-hidden="true" />
            How you earn points
          </p>
          <ul className="mt-3 space-y-2 text-sm text-emerald-900">
            {EARN.map((e) => (
              <li key={e.what} className="flex items-start justify-between gap-3">
                <span>{e.what}</span>
                <span className="shrink-0 font-bold text-emerald-700">{e.pts}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-red-800">
            <TrendingDown size={16} aria-hidden="true" />
            How you lose points
          </p>
          <ul className="mt-3 space-y-2 text-sm text-red-900">
            {LOSE.map((e) => (
              <li key={e.what} className="flex items-start justify-between gap-3">
                <span>{e.what}</span>
                <span className="shrink-0 font-bold text-red-600">{e.pts}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-stone-500">
        What your level does for you
      </h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {BENEFITS.map((b) => (
          <div key={b.title} className="rounded-xl bg-cream p-4 ring-1 ring-coffee-200">
            <p className="font-semibold text-coffee-900">{b.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-stone-600">{b.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
