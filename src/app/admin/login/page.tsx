"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import CaptchaWidget from "@/components/CaptchaWidget";

const captchaNeeded =
  Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) ||
  Boolean(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY);

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (captchaNeeded && !captchaToken) {
      setError("Please complete the bot check and try again.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, captchaToken: captchaToken || "" }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }
    if (data.role !== "admin") {
      setError("This account does not have admin access");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-brand-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-brand-800 bg-brand-900 p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-white">SkySurvey Admin</h1>
        <p className="mt-1 text-sm text-brand-300">Restricted area — admins only</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-200">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-brand-700 bg-brand-950/60 px-3 py-2 text-white outline-none focus:border-brand-400"
              placeholder="admin@skysurvey.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-200">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-brand-700 bg-brand-950/60 px-3 py-2 pr-11 text-white outline-none focus:border-brand-400"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-brand-300 hover:text-white"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>
          <CaptchaWidget onToken={setCaptchaToken} theme="dark" />
          {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-600 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in to admin"}
          </button>
        </form>
      </div>
    </main>
  );
}
