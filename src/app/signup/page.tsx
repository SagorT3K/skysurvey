import { Suspense } from "react";
import SignupForm from "@/components/SignupForm";
import { getConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const config = await getConfig();
  return (
    <Suspense fallback={<main className="flex flex-1 items-center justify-center p-8 text-slate-500">Loading…</main>}>
      <SignupForm signupBonus={config.signup_bonus_coins} />
    </Suspense>
  );
}
