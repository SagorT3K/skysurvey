import Link from "next/link";
import type { LucideIcon } from "lucide-react";
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
import AppFooter from "@/components/AppFooter";
import CookieConsent from "@/components/CookieConsent";
import CountUp from "@/components/CountUp";
import Logo from "@/components/Logo";
import MoneyPlane from "@/components/MoneyPlane";
import Reveal from "@/components/Reveal";
import { getConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

type Stat = {
  icon: LucideIcon;
  label: string;
  end: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
};

const STATS: Stat[] = [
  { icon: Radio, label: "Live:", end: 1247, suffix: " users earning" },
  { icon: Banknote, label: "Paid out today:", end: 12340, prefix: "$" },
  { icon: Star, label: "Rating:", end: 4.6, decimals: 1, suffix: " / 5" },
];

const BRANDS = [
  { name: "PayPal", slug: "paypal" },
  { name: "Amazon", slug: "amazon" },
  { name: "Netflix", slug: "netflix" },
  { name: "Starbucks", slug: "starbucks" },
  { name: "Uber", slug: "uber" },
  { name: "Visa", slug: "visa" },
  { name: "Bitcoin", slug: "bitcoin" },
  { name: "Crypto (USDT)", slug: "tether" },
];

const STEPS = [
  { icon: UserPlus, title: "Create your free account", text: "" },
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
  "Every payout request is reviewed by our team before release",
  "PayPal cash or gift cards — you decide every time",
];

const FAQS = [
  { q: "How much can I earn?", a: "Surveys typically pay between 40 and 200 coins depending on length. With daily check-ins and referrals, active members earn steadily — your results depend on how many surveys you complete." },
  { q: "When can I withdraw my coins?", a: "Coins from completed surveys are available right away. When you request a payout, our team reviews the request and releases the payment — pending requests show as Pending until then." },
  { q: "How do I get paid?", a: "We pay via PayPal or popular gift cards (Amazon, Netflix, Starbucks and more). Minimum cashout is 500 coins = $5." },
  { q: "Who can join SkySurvey?", a: "Membership is open to residents of the US, UK, Canada, France and other supported countries. You must be at least 18 years old (or the age of majority in your region) and provide accurate information." },
  { q: "Is SkySurvey free?", a: "Yes — SkySurvey is 100% free to join and use. We never ask for payment details to sign up." },
  { q: "How do levels work?", a: "Every member has a trust score that starts at 100 — that is Level 1. You earn points with daily check-ins (+2), completing surveys (+1), and paid redemptions (+5). Reach 200 points for Level 2, 300 for Level 3, and so on. Each level pays +2% more on every survey, and higher levels get their cashouts reviewed first. Points drop if surveys are reversed or rules are broken, so levels reflect how reliable a member you are." },
];

const FLOATING_COINS = [
  { Icon: Coins, className: "left-[7%] top-[24%] text-brand-400/40", size: 40, delay: "0s" },
  { Icon: Coins, className: "right-[9%] top-[30%] text-amber-300/50", size: 34, delay: "1.2s" },
  { Icon: Gift, className: "left-[16%] bottom-[16%] text-fuchsia-400/40", size: 28, delay: "0.6s" },
  { Icon: Star, className: "right-[18%] bottom-[22%] text-brand-300/40", size: 22, delay: "1.8s" },
];

export default async function Home() {
  const config = await getConfig();
  const bonus = config.signup_bonus_coins;
  const hasBonus = bonus > 0;
  const fmtBonus = bonus.toLocaleString("en-US");

  const steps = [
    {
      ...STEPS[0],
      text: hasBonus
        ? `Sign up in under a minute and instantly claim ${fmtBonus} welcome coins. No fees, ever.`
        : "Sign up in under a minute — free to join, no fees, no credit card.",
    },
    STEPS[1],
    STEPS[2],
  ];

  const payoutCta = hasBonus ? `Claim your ${fmtBonus} bonus coins` : "Start earning — it's free";

  return (
    <main className="flex-1">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-brand-200 bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-medium text-brand-900 md:flex">
            <a href="#how" className="hover:text-brand-600">How it works</a>
            <a href="#earn" className="hover:text-brand-600">Ways to earn</a>
            <a href="#payouts" className="hover:text-brand-600">Rewards</a>
            <a href="#faq" className="hover:text-brand-600">FAQ</a>
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/login" className="rounded-lg px-4 py-2 font-medium text-brand-900 hover:bg-brand-100">
              Sign in
            </Link>
            <Link href="/signup" className="btn-shine rounded-lg bg-gradient-to-r from-brand-700 to-brand-600 px-4 py-2 font-semibold text-white shadow-sm transition hover:shadow-md hover:shadow-brand-300">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-950 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.28),transparent_60%)]" />
        <div className="animate-drift pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-600/40 blur-3xl" />
        <div className="animate-drift-slow pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-fuchsia-600/25 blur-3xl" />
        {FLOATING_COINS.map(({ Icon, className, size, delay }, i) => (
          <Icon
            key={i}
            size={size}
            style={{ animationDelay: delay }}
            className={`animate-float pointer-events-none absolute hidden md:block ${className}`}
            aria-hidden="true"
          />
        ))}
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:gap-6 lg:py-24">
          <div className="text-center lg:text-left">
            {hasBonus && (
              <div className="animate-fade-up mb-4" style={{ animationDelay: "0s" }}>
                <p className="animate-pulse-glow inline-flex items-center gap-2 rounded-full border border-brand-500/50 bg-brand-800/60 px-4 py-1.5 text-sm font-medium text-brand-100">
                  <Gift size={16} className="text-amber-300" aria-hidden="true" />
                  {fmtBonus} free coins when you join today
                </p>
              </div>
            )}
            <h1
              className="animate-fade-up mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl lg:mx-0"
              style={{ animationDelay: "0.15s" }}
            >
              Get paid for your{" "}
              <span className="text-shine bg-gradient-to-r from-violet-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent">
                opinions
              </span>
            </h1>
            <p
              className="animate-fade-up mx-auto mt-5 max-w-2xl text-lg text-brand-100/90 lg:mx-0"
              style={{ animationDelay: "0.3s" }}
            >
              Take online surveys from world-class market research brands, earn coins for every
              completed survey, and cash out from just $5.
            </p>
            <div
              className="animate-fade-up mt-9 flex flex-wrap items-center justify-center gap-4 lg:justify-start"
              style={{ animationDelay: "0.45s" }}
            >
              <Link
                href="/signup"
                className="btn-shine group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-8 py-3.5 text-lg font-bold text-white shadow-lg shadow-brand-900/50 transition hover:shadow-xl hover:shadow-brand-700/40"
              >
                Start earning — it&apos;s free
                <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
              <Link href="/login" className="rounded-xl border border-brand-400/60 px-8 py-3.5 text-lg font-medium text-brand-100 transition hover:bg-brand-800/60">
                Sign in
              </Link>
            </div>
            <div
              className="animate-fade-up mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-brand-100/85 lg:mx-0 lg:justify-start"
              style={{ animationDelay: "0.6s" }}
            >
              {STATS.map(({ icon: Icon, label, end, prefix, suffix, decimals }) => (
                <span key={label} className="flex items-center gap-2">
                  <Icon size={16} className="text-brand-300" aria-hidden="true" />
                  <b className="text-white">{label}</b>{" "}
                  <b className="text-white">
                    <CountUp end={end} prefix={prefix} suffix={suffix} decimals={decimals} />
                  </b>
                </span>
              ))}
            </div>
          </div>
          <div className="animate-fade-up" style={{ animationDelay: "0.35s" }}>
            <MoneyPlane />
          </div>
        </div>
      </section>

      {/* Brands — auto-scrolling logo marquee */}
      <section className="border-b border-brand-200 bg-white py-10">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-brand-600">
            <Gift size={15} aria-hidden="true" />
            Redeem your coins for rewards from top brands
          </p>
        </div>
        <div
          className="marquee-paused group relative mt-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
          aria-label="Redeem brands"
        >
          <div className="animate-marquee flex w-max">
            {[0, 1].map((copy) => (
              <ul
                key={copy}
                aria-hidden={copy === 1}
                className="flex items-center gap-4 pr-4"
              >
                {BRANDS.map(({ name, slug }) => (
                  <li
                    key={name}
                    className="flex shrink-0 items-center gap-2.5 rounded-2xl border border-brand-200 bg-surface px-6 py-3 shadow-sm transition hover:border-brand-400 hover:shadow-md"
                  >
                    <img
                      src={`/brands/${slug}.svg`}
                      alt=""
                      width={24}
                      height={24}
                      loading="lazy"
                      aria-hidden="true"
                      className="h-6 w-auto max-w-[110px] object-contain"
                    />
                    <span className="text-sm font-semibold tracking-tight text-brand-900">
                      {name}
                    </span>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal>
            <h2 className="text-center text-3xl font-bold text-brand-900">How it works</h2>
            <p className="mt-3 text-center text-stone-600">Three steps between you and your first payout.</p>
          </Reveal>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map(({ icon: Icon, ...s }, i) => (
              <Reveal key={s.title} delay={i * 130}>
                <div className="relative h-full rounded-2xl border border-brand-200 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-200/60">
                  <span className="absolute -top-4 left-7 rounded-full bg-gradient-to-r from-brand-600 to-brand-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
                    STEP {i + 1}
                  </span>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                    <Icon size={24} strokeWidth={1.9} aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-brand-900">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-stone-600">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Ways to earn */}
      <section id="earn" className="border-y border-brand-200 bg-white py-20">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal>
            <h2 className="text-center text-3xl font-bold text-brand-900">Four ways to earn</h2>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {EARN_METHODS.map(({ icon: Icon, ...m }, i) => (
              <Reveal key={m.title} delay={i * 110}>
                <div className="h-full rounded-2xl bg-surface p-6 ring-1 ring-brand-200 transition duration-300 hover:-translate-y-1 hover:shadow-md hover:shadow-brand-200/60">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                    <Icon size={22} strokeWidth={1.9} aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-bold text-brand-900">{m.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{m.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Payouts */}
      <section id="payouts" className="py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-2">
          <Reveal>
            <div>
              <h2 className="text-3xl font-bold text-brand-900">Simple payouts, no surprises</h2>
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
          </Reveal>
          <Reveal delay={150}>
            <div className="rounded-2xl border border-brand-200 bg-white p-7 shadow-sm">
              <h3 className="font-bold text-brand-900">Payout levels</h3>
              <table className="mt-4 w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-brand-500">
                    <th className="pb-2">You redeem</th>
                    <th className="pb-2 text-right">You receive</th>
                  </tr>
                </thead>
                <tbody>
                  {PAYOUTS.map((p) => (
                    <tr key={p.coins} className="border-t border-brand-100">
                      <td className="py-3 font-semibold text-brand-800">
                        <span className="inline-flex items-center gap-2">
                          <Coins size={16} className="text-amber-500" aria-hidden="true" />
                          {p.coins}
                        </span>
                      </td>
                      <td className="py-3 text-right font-bold text-emerald-700">{p.usd}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Link href="/signup" className="btn-shine mt-5 block rounded-xl bg-gradient-to-r from-brand-700 to-brand-600 py-3 text-center font-semibold text-white transition hover:shadow-md hover:shadow-brand-300">
                {payoutCta}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y border-brand-200 bg-white py-20">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal>
            <h2 className="text-center text-3xl font-bold text-brand-900">Members love SkySurvey</h2>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 130}>
                <figure className="h-full rounded-2xl bg-surface p-6 ring-1 ring-brand-200 transition duration-300 hover:-translate-y-1 hover:shadow-md hover:shadow-brand-200/60">
                  <div className="flex gap-0.5 text-amber-400" aria-label="Rated 5 out of 5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} size={16} className="fill-current" aria-hidden="true" />
                    ))}
                  </div>
                  <blockquote className="mt-3 leading-relaxed text-stone-700">“{t.quote}”</blockquote>
                  <figcaption className="mt-4 text-sm">
                    <span className="font-bold text-brand-900">{t.name}</span>
                    <span className="text-stone-500"> · {t.role}</span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-20">
        <Reveal>
          <h2 className="text-center text-3xl font-bold text-brand-900">Frequently asked questions</h2>
          <div className="mt-10 space-y-4">
            {FAQS.map((f) => (
              <details key={f.q} className="group rounded-xl border border-brand-200 bg-white p-5 transition open:shadow-sm hover:border-brand-300">
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold text-brand-900 [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown
                    size={18}
                    className="shrink-0 text-brand-500 transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="mt-3 leading-relaxed text-stone-600">{f.a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700 py-16 text-center text-white">
        <div className="animate-drift pointer-events-none absolute -right-20 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <Reveal className="relative">
          <h2 className="text-3xl font-bold">Your opinion is worth more than you think</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100/90">
            {hasBonus
              ? `Join thousands of members getting paid for everyday opinions. Free to start, ${fmtBonus} bonus coins waiting.`
              : "Join thousands of members getting paid for everyday opinions. Free to start — no fees, ever."}
          </p>
          <Link
            href="/signup"
            className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-10 py-3.5 text-lg font-bold text-brand-900 transition hover:-translate-y-0.5 hover:bg-brand-50 hover:shadow-lg"
          >
            Get started now
            <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </Reveal>
      </section>

      <AppFooter />
      <CookieConsent />
    </main>
  );
}
