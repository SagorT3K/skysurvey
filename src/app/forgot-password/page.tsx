import Link from "next/link";
import Logo from "@/components/Logo";
import ForgotPasswordForm from "@/components/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-brand-200 bg-white p-8 shadow-sm">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-brand-900">Reset your password</h1>
        <p className="mt-1 text-sm text-stone-500">
          We email a 6-digit code — enter it with a new password and you are back in.
        </p>

        <ForgotPasswordForm />

        <p className="mt-6 text-center text-sm text-stone-600">
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}