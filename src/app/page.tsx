import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  ChevronDown,
  CircleCheckBig,
  ClipboardList,
  Coins,
  Flame,
  Gift,
  Radio,
  Star,
  Trophy,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import CookieConsent from "@/components/CookieConsent";
import Logo from "@/components/Logo";

const STATS = [
  { icon: Radio, label: "Live:", value: "1,247 users earning" },
  { icon: Banknote, label: "Paid out today:", value: "$12,340" },
  { icon: Star, label: "Rating:", value: "4.6 / 5" },
];

const BRANDS = ["PayPal", "Amazon", "Netflix", "Starbucks", "Uber", "Visa"];

const STEPS = [
  {
    icon: UserPlus,
    title: "Create your free account",
    text: "Sign up in under a minute and instantly claim 100 welcome coins. No fees, ever.",
  },
  {
    icon: ClipboardList,
    title: "Complete paid surveys",
    text: "Answer surveys matched to your profile. Coin rewards are shown up front — longer surveys pay more.",
  },
  {
    icon: Wallet,
    title: "Cash out from $5",
    text: "Withdraw to PayPal or pick a gift card. Requests are reviewed and paid fast.",
  },
];

const EARN_METHODS = [
  { icon: ClipboardList, title: "Paid Surveys", text: "The core way to earn — new surveys added daily from top research partners." },
  { icon: Flame, title: "Daily Check-in", text: "Open SkySurvey every day and grab bonus coins just for showing up." },
  { icon: Users, title: "Referrals", text: "Invite friends with your personal link and earn coins when they join." },
  { icon: Trophy, title: "Leaderboard", text: "Compete with other members — top earners get featured on the board." },
];

const PAYOUTS = [
  { coins: "500 coins", usd: "$5.00" },
  { coins: "1,000 coins", usd: "$10.00" },
  { coins: "2,500 coins", usd: "$25.00" },
  { coins: "5,000 coins", usd: "$50.00" },
];

const TESTIMONIALS = [
  { name: "Sarah M.", role: "Member since 2025", quote: "Cashed out my first $25 to PayPal within two weeks. The surveys actually match my interests." },
  { name: "James T.", role: "Member since 2025", quote: "Clean interface, rewards show up exactly when they say. Way better than other sites I tried." },
  { name: "Emily R.", role: "Member since 2026", quote: "The daily check-in and leaderboard keep me coming back. Already on my third gift card." },
];

const PAYOUT_NOTES = [
  "Coins are credited right after your survey is validated",
  "7-day hold protects the quality of the program (and your payouts)",
  "PayPal cash or gift cards — you decide every time",
];

const FAQS = [
  { q: "How much can I earn?", a: "Surveys typically pay between 40 and 200 coins depending on length. With daily check-ins and referrals, active members earn steadily — your results depend on how many surveys you complete." },
  { q: "When can I withdraw my coins?", a: "Coins from surveys are held for 7 days while our research partners validate the data, then they become withdrawable. Signup and referral bonuses are available immediately." },
  { q: "How do I get paid?", a: "We pay via PayPal or popular gift cards (Amazon, Netflix, Starbucks and more). Minimum cashout is 500 coins = $5." },
  { q: "Who can join SkySurvey?", a: "Membership is open to residents of the US, UK, Canada, France and other supported countries. You must be at least 18 years old (or the age of majority in your region) and provide accurate information." },
  { q: "Is SkySurvey free?", a: "Yes — SkySurvey is 100% free to join and use. We never ask for payment details to sign up." },
];

export default function Home() {
  return (
    <main className="flex-1">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-coffee-200 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-medium text-coffee-800 md:flex">
            <a href="#how" className="hover:text-coffee-600">How it works</a>
            <a href="#earn" className="hover:text-coffee-600">Ways to earn</a>
            <a href="#payouts" className="hover:text-coffee-600">Rewards</a>
            <a href="#faq" className="hover:text-coffee-600">FAQ</a>
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/login" className="rounded-lg px-4 py-2 font-medium text-coffee-800 hover:bg-coffee-100">
              Sign in
            </Link>
            <Link href="/signup" className="rounded-lg bg-coffee-700 px-4 py-2 font-semibold text-white shadow-sm hover:bg-coffee-800">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-coffee-950 via-coffee-900 to-coffee-800 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-coffee-700/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-coffee-600/30 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 text-center">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-coffee-500/50 bg-coffee-800/60 px-4 py-1.5 text-sm font-medium text-coffee-100">
            <Gift size={16} className="text-coffee-300" aria-hidden="true" />
            100 free coins when you join today
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Get paid for your <span className="text-coffee-300">opinions</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-coffee-100/90">
            Take online surveys from world-class market research brands, earn coins for every
            completed survey, and cash out from just $5.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 rounded-xl bg-coffee-400 px-8 py-3.5 text-lg font-bold text-coffee-950 shadow-lg transition hover:bg-coffee-300"
            >
              Start earning — it&apos;s free
              <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link href="/login" className="rounded-xl border border-coffee-400/60 px-8 py-3.5 text-lg font-medium text-coffee-100 hover:bg-coffee-800/60">
              Sign in
            </Link>
          </div>
          <div className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-coffee-100/85">
            {STATS.map(({ icon: Icon, ...s }) => (
              <span key={s.value} className="flex items-center gap-2">
                <Icon size={16} className="text-coffee-300" aria-hidden="true" />
                <b className="text-white">{s.label}</b> {s.value}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Brands */}
      <section className="border-b border-coffee-200 bg-white py-10">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-coffee-600">
            <Gift size={15} aria-hidden="true" />
            Redeem your coins for rewards from top brands
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {BRANDS.map((name) => (
              <span
                key={name}
                className="rounded-full border border-coffee-200 bg-cream px-5 py-2.5 text-sm font-semibold tracking-tight text-coffee-700 transition hover:border-coffee-400 hover:text-coffee-900"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold text-coffee-900">How it works</h2>
          <p className="mt-3 text-center text-coffee-700">Three steps between you and your first payout.</p>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, ...s }, i) => (
              <div key={s.title} className="relative rounded-2xl border border-coffee-200 bg-white p-7 shadow-sm">
                <span className="absolute -top-4 left-7 rounded-full bg-coffee-700 px-3 py-1 text-xs font-bold text-white">
                  STEP {i + 1}
                </span>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-coffee-100 text-coffee-700">
                  <Icon size={24} strokeWidth={1.9} aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-coffee-900">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-stone-600">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ways to earn */}
      <section id="earn" className="border-y border-coffee-200 bg-white py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold text-coffee-900">Four ways to earn</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {EARN_METHODS.map(({ icon: Icon, ...m }) => (
              <div key={m.title} className="rounded-2xl bg-cream p-6 ring-1 ring-coffee-200 transition hover:shadow-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-coffee-100 text-coffee-700">
                  <Icon size={22} strokeWidth={1.9} aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-bold text-coffee-900">{m.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{m.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Payouts */}
      <section id="payouts" className="py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold text-coffee-900">Simple payouts, no surprises</h2>
            <p className="mt-4 leading-relaxed text-stone-600">
              Every survey shows its coin reward before you start. 1 coin = $0.01, always. Once you
              hit 500 coins you can request a PayPal payment or swap for a gift card — your choice.
            </p>
            <ul className="mt-6 space-y-3 text-stone-700">
              {PAYOUT_NOTES.map((note) => (
                <li key={note} className="flex gap-3">
                  <CircleCheckBig size={20} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-coffee-200 bg-white p-7 shadow-sm">
            <h3 className="font-bold text-coffee-900">Payout levels</h3>
            <table className="mt-4 w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-coffee-500">
                  <th className="pb-2">You redeem</th>
                  <th className="pb-2 text-right">You receive</th>
                </tr>
              </thead>
              <tbody>
                {PAYOUTS.map((p) => (
                  <tr key={p.coins} className="border-t border-coffee-100">
                    <td className="py-3 font-semibold text-coffee-800">
                      <span className="inline-flex items-center gap-2">
                        <Coins size={16} className="text-coffee-500" aria-hidden="true" />
                        {p.coins}
                      </span>
                    </td>
                    <td className="py-3 text-right font-bold text-emerald-700">{p.usd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Link href="/signup" className="mt-5 block rounded-xl bg-coffee-700 py-3 text-center font-semibold text-white hover:bg-coffee-800">
              Claim your 100 bonus coins
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y border-coffee-200 bg-white py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold text-coffee-900">Members love SkySurvey</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="rounded-2xl bg-cream p-6 ring-1 ring-coffee-200">
                <div className="flex gap-0.5 text-coffee-500" aria-label="Rated 5 out of 5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={16} className="fill-current" aria-hidden="true" />
                  ))}
                </div>
                <blockquote className="mt-3 leading-relaxed text-stone-700">“{t.quote}”</blockquote>
                <figcaption className="mt-4 text-sm">
                  <span className="font-bold text-coffee-900">{t.name}</span>
                  <span className="text-stone-500"> · {t.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold text-coffee-900">Frequently asked questions</h2>
        <div className="mt-10 space-y-4">
          {FAQS.map((f) => (
            <details key={f.q} className="group rounded-xl border border-coffee-200 bg-white p-5 open:shadow-sm">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold text-coffee-900 [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown
                  size={18}
                  className="shrink-0 text-coffee-500 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="mt-3 leading-relaxed text-stone-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-coffee-800 to-coffee-700 py-16 text-center text-white">
        <h2 className="text-3xl font-bold">Your opinion is worth more than you think</h2>
        <p className="mx-auto mt-3 max-w-xl text-coffee-100/90">
          Join thousands of members getting paid for everyday opinions. Free to start, 100 bonus
          coins waiting.
        </p>
        <Link
          href="/signup"
          className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-coffee-300 px-10 py-3.5 text-lg font-bold text-coffee-950 hover:bg-coffee-200"
        >
          Get started now
          <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      </section>

      <SiteFooter />
      <CookieConsent />
    </main>
  );
}






