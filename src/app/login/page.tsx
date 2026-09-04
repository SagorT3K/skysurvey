"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, Lock, Mail, TriangleAlert } from "lucide-react";
import Logo from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }
    router.push(data.role === "admin" ? "/admin" : "/dashboard");
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-coffee-200 bg-white p-8 shadow-sm">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-coffee-900">Welcome back</h1>
        <p className="mt-1 text-sm text-stone-500">Sign in to your SkySurvey account</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-stone-700">
              <Mail size={14} className="text-coffee-500" aria-hidden="true" />
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-coffee-200 px-3 py-2 outline-none focus:border-coffee-500 focus:ring-2 focus:ring-coffee-100"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-stone-700">
              <Lock size={14} className="text-coffee-500" aria-hidden="true" />
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-coffee-200 px-3 py-2 outline-none focus:border-coffee-500 focus:ring-2 focus:ring-coffee-100"
              placeholder="••••••••"
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
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-coffee-700 py-2.5 font-semibold text-white hover:bg-coffee-800 disabled:opacity-60"
          >
            {loading ? (
              <>
                <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />
                Signing in
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-600">
          New to SkySurvey?{" "}
          <Link href="/signup" className="font-semibold text-coffee-700 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
