"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, Eye, EyeOff, LoaderCircle, TriangleAlert } from "lucide-react";
import CaptchaWidget from "./CaptchaWidget";

const COUNTRIES = ["US", "UK", "CA", "FR", "DE", "AU", "Other"];
const captchaNeeded =
  Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) ||
  Boolean(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY);

export default function SignupForm({ signupBonus }: { signupBonus: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    country: "US",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [resendToken, setResendToken] = useState<string | null>(null);
  const [step, setStep] = useState<"details" | "code">("details");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submitDetails(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (captchaNeeded && !captchaToken) {
      setError("Please complete the bot check and try again.");
      return;
    }
    setLoading(true);
    const ref = params.get("ref") || "";
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, ref, captchaToken: captchaToken || "" }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong");
      if (data.step === "code") setStep("code");
      return;
    }
    setStep("code");
    setInfo(`We sent a 6-digit code to ${form.email}. Enter it below to finish.`);
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    const res = await fetch("/api/auth/signup/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, code }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function resend() {
    setError("");
    setInfo("");
    if (captchaNeeded && !resendToken) {
      setError("Please complete the bot check to resend the code.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/signup/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, captchaToken: resendToken || "" }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not resend the code");
      return;
    }
    setInfo(`A fresh code is on its way to ${form.email}.`);
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-brand-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-brand-900">Create your account</h1>
        {signupBonus > 0 ? (
          <p className="mt-1 text-sm text-stone-500">
            Get <b>{signupBonus.toLocaleString("en-US")} bonus coins</b> when you sign up.
          </p>
        ) : (
          <p className="mt-1 text-sm text-stone-500">
            Free to join — start earning with your first survey.
          </p>
        )}
        {params.get("ref") && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
            <BadgeCheck size={16} aria-hidden="true" />
            Referral code applied
          </p>
        )}

        {step === "details" ? (
          <form onSubmit={submitDetails} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Display name</label>
              <input
                required
                value={form.username}
                onChange={(e) => set("username", e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                placeholder="John D."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 pr-11 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  placeholder="At least 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-stone-500 hover:text-stone-700"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">
                Country of residence
              </label>
              <select
                required
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-stone-500">
                Must match your actual residence. Accounts are verified against your IP location.
              </p>
            </div>
            <CaptchaWidget onToken={setCaptchaToken} />
            {error && (
              <p className="inline-flex w-full items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                <TriangleAlert size={15} className="shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}
            {info && (
              <p className="w-full rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{info}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-700 py-2.5 font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />
                  Sending code
                </>
              ) : (
                "Continue"
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="mt-6 space-y-4">
            <p className="text-sm text-stone-600">
              We sent a 6-digit code to <b>{form.email}</b>. Enter it below (expires in 15
              minutes).
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">
                Verification code
              </label>
              <input
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-center text-xl tracking-[0.5em] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                placeholder="••••••"
              />
            </div>
            {error && (
              <p className="inline-flex w-full items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                <TriangleAlert size={15} className="shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}
            {info && (
              <p className="w-full rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{info}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-700 py-2.5 font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />
                  Verifying
                </>
              ) : (
                "Verify & create account"
              )}
            </button>
            <div className="rounded-xl bg-stone-50 p-3">
              <p className="text-xs text-stone-500">Didn&apos;t get the code?</p>
              <div className="mt-2">
                <CaptchaWidget onToken={setResendToken} />
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={resend}
                  disabled={loading}
                  className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-white disabled:opacity-60"
                >
                  Resend code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("details");
                    setError("");
                    setInfo("");
                  }}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-700 hover:underline"
                >
                  Change email
                </button>
              </div>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-stone-600">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
