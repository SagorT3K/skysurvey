import { Suspense } from "react";
import SignupForm from "@/components/SignupForm";

export default function SignupPage() {
  return (
    <Suspense fallback={<main className="flex flex-1 items-center justify-center p-8 text-slate-500">Loading…</main>}>
      <SignupForm />
    </Suspense>
  );
}
