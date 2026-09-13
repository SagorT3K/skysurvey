import { redirect } from "next/navigation";
import { CalendarDays, Copy, Globe2, Mail, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isHeld, holdDurationLeft } from "@/lib/auth";
import { getWalletSummary } from "@/lib/ledger";
import { levelFromScore, levelProgress } from "@/lib/score";
import { getConfig } from "@/lib/config";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import ProfileForm from "@/components/ProfileForm";
import CopyReferralLink from "@/components/CopyReferralLink";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user || user.role === "admin") redirect("/login");

  const config = await getConfig();
  const wallet = await getWalletSummary(user.id);
  const held = isHeld(user);
  const holdLeft = holdDurationLeft(user);
  const referredCount = await prisma.user.count({ where: { referredById: user.id } });

  const demo = [
    { label: "Gender", value: user.gender },
    { label: "Age group", value: user.ageGroup },
    { label: "Ethnicity", value: user.ethnicity },
    { label: "Education", value: user.education },
    { label: "Household income", value: user.householdIncome },
    { label: "Employment", value: user.employment },
    { label: "State / region", value: user.state },
  ];
  const filled = demo.filter((d) => d.value).length;

  return (
    <main className="app-dark flex min-h-screen flex-1 flex-col">
      <AppHeader active="profile" balance={wallet.balance} />

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold text-white">Your profile</h1>
        <p className="mt-1 text-slate-400">
          Keep your details accurate — survey answers are checked against them when research
          partners question a response.
        </p>

        {held && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-300 backdrop-blur">
            <ShieldAlert size={22} className="mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-bold">Sorry, you can&apos;t earn right now.</p>
              <p className="mt-1 text-sm">
                Your account has been held for {holdLeft}. Profile editing is paused too.
              </p>
            </div>
          </div>
        )}

        {/* Account snapshot */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="glass rounded-2xl p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-slate-400">
              <Mail size={15} aria-hidden="true" />
              Email
            </p>
            <p className="mt-1 truncate font-semibold text-white">{user.email}</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-slate-400">
              <Globe2 size={15} aria-hidden="true" />
              Country
            </p>
            <p className="mt-1 font-semibold text-white">{user.country || "—"}</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-slate-400">
              <CalendarDays size={15} aria-hidden="true" />
              Member since
            </p>
            <p className="mt-1 font-semibold text-white">
              {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="glass rounded-2xl p-5">
            <p className="text-sm font-medium text-slate-400">Trust level</p>
            <p className="mt-1 font-bold text-white">
              Lv {levelFromScore(user.score)}{" "}
              <span className="text-sm font-medium text-slate-400">({user.score} pts)</span>
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-300"
                style={{ width: `${levelProgress(user.score).pct}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {levelProgress(user.score).needed - levelProgress(user.score).into} pts to level{" "}
              {levelFromScore(user.score) + 1} · each level = +2% survey coins
            </p>
          </div>
        </div>

        {/* Demographics completeness */}
        <div
          className={`mt-4 flex items-center gap-3 rounded-2xl border p-4 ${
            filled === demo.length
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
              : "border-amber-400/30 bg-amber-500/10 text-amber-300"
          }`}
        >
          {filled === demo.length ? (
            <ShieldCheck size={18} className="shrink-0" aria-hidden="true" />
          ) : (
            <ShieldAlert size={18} className="shrink-0" aria-hidden="true" />
          )}
          <p className="text-sm">
            {filled === demo.length
              ? "Profile complete — this builds trust when partners review your survey answers."
              : `${filled} of ${demo.length} demographic fields filled. Complete profiles pass partner checks faster and unlock more surveys.`}
          </p>
        </div>

        {/* Edit form */}
        <div className="glass mt-6 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white">Personal details</h2>
          <p className="mt-1 text-sm text-slate-500">
            Only you and the review team can see this. It is never shared with survey partners
            directly.
          </p>
          <div className="mt-5">
            <ProfileForm
              initial={{
                username: user.username,
                state: user.state,
                gender: user.gender,
                ageGroup: user.ageGroup,
                ethnicity: user.ethnicity,
                education: user.education,
                householdIncome: user.householdIncome,
                employment: user.employment,
                paypalEmail: user.paypalEmail,
              }}
              options={{
                gender: ["", "Female", "Male", "Non-binary", "Prefer not to say"],
                ageGroup: ["", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"],
                ethnicity: ["", "White", "Black or African American", "Hispanic or Latino", "Asian", "Native American", "Middle Eastern", "Multiracial", "Other", "Prefer not to say"],
                education: ["", "High school or below", "Some college", "Bachelor's degree", "Graduate degree", "Prefer not to say"],
                householdIncome: ["", "Under $25k", "$25k-$50k", "$50k-$75k", "$75k-$100k", "$100k-$150k", "$150k+", "Prefer not to say"],
                employment: ["", "Employed full-time", "Employed part-time", "Self-employed", "Student", "Homemaker", "Retired", "Unemployed"],
              }}
            />
          </div>
        </div>

        {/* Invite friends */}
        <div className="glass mt-6 rounded-2xl p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <Users size={20} className="text-brand-300" aria-hidden="true" />
            Invite friends
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Share your referral link and earn{" "}
            <b>{config.referral_bonus_coins} coins</b> when your friend completes their first
            paid redemption. So far{" "}
            <b>
              {referredCount} friend{referredCount === 1 ? "" : "s"}
            </b>{" "}
            joined with your link.
          </p>
          <CopyReferralLink link={`skysurvey.com/signup?ref=${user.referralCode}`} />
        </div>
      </div>

      <AppFooter variant="app" />
    </main>
  );
}
