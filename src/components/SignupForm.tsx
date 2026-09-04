"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, LoaderCircle, TriangleAlert } from "lucide-react";

const COUNTRIES = ["US", "UK", "CA", "FR", "DE", "AU", "Other"];

export default function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    country: "US",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const ref = params.get("ref") || "";
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, ref }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-coffee-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-coffee-900">Create your account</h1>
        <p className="mt-1 text-sm text-stone-500">
          Get <b>100 bonus coins</b> when you sign up.
        </p>
        {params.get("ref") && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
            <BadgeCheck size={16} aria-hidden="true" />
            Referral code applied
          </p>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Display name</label>
            <input
              required
              value={form.username}
              onChange={(e) => set("username", e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-coffee-500 focus:ring-2 focus:ring-coffee-100"
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
              className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-coffee-500 focus:ring-2 focus:ring-coffee-100"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-coffee-500 focus:ring-2 focus:ring-coffee-100"
              placeholder="At least 6 characters"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Country of residence
            </label>
            <select
              required
              value={form.country}
              onChange={(e) => set("country", e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-coffee-500 focus:ring-2 focus:ring-coffee-100"
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
          {error && (
            <p className="inline-flex w-full items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              <TriangleAlert size={15} className="shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-coffee-700 py-2.5 font-semibold text-white hover:bg-coffee-800 disabled:opacity-60"
          >
            {loading ? (
              <>
                <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />
                Creating account
              </>
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-600">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-coffee-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
