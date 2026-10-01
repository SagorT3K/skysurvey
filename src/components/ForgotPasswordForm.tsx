"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, TriangleAlert } from "lucide-react";
import { SUPPORT_EMAIL } from "@/lib/support";

/**
 * Two steps, mirroring the signup form: ask for the email, then take the emailed
 * code together with the new password. The wording of step one never says whether
 * the address has an account, because the API cannot tell either.
 */
export default function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong");
      if (data.step === "code") setStep("code");
      return;
    }
    setStep("code");
    setInfo(
      `If an account exists for ${email}, a 6-digit code is on its way. It expires in ${
        data.expiresInMinutes ?? 15
      } minutes.`,
    );
  }

  async function resend() {
    setError("");
    setInfo("");
    setLoading(true);
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not send a new code");
      return;
    }
    setInfo("A fresh code is on its way. The older one no longer works.");
  }

  async function submitNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    const res = await fetch("/api/auth/reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }
    router.push(data.role === "admin" ? "/admin" : "/dashboard");
    router.refresh();
  }

  if (step === "email") {
    return (
      <form onSubmit={requestCode} className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">
            Email on your account
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            placeholder="you@example.com"
          />
        </div>
        {error && (
          <p className="inline-flex w-full items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            <TriangleAlert size={15} className="shrink-0" aria-hidden="true" />
            {error}
          </p>
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
            "Send reset code"
          )}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submitNewPassword} className="mt-6 space-y-4">
      <p className="text-sm text-stone-600">
        Enter the code we sent to <b>{email}</b> and choose your new password.
      </p>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">Reset code</label>
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
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">New password</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
            Saving
          </>
        ) : (
          "Set new password & sign in"
        )}
      </button>
      <div className="rounded-xl bg-stone-50 p-3">
        <p className="text-xs text-stone-500">
          Code not arrived? Check your spam folder, then send a new one — the older code stops
          working.
        </p>
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
              setStep("email");
              setCode("");
              setPassword("");
              setError("");
              setInfo("");
            }}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-700 hover:underline"
          >
            Change email
          </button>
        </div>
        <p className="mt-2 text-xs text-stone-500">
          Still stuck? Write to{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="font-semibold text-brand-600 hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </div>
    </form>
  );
}
