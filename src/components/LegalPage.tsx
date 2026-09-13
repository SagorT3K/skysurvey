import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AppFooter from "@/components/AppFooter";
import Logo from "@/components/Logo";

export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="app-dark flex-1">
      <header className="border-b border-white/10 bg-[#0b0a18]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Logo />
          <Link
            href="/#faq"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-300 hover:text-white"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to home
          </Link>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-4 py-14">
        <h1 className="text-3xl font-bold text-white">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: {updated}</p>
        <div className="prose-coffee mt-10 space-y-8">{children}</div>
      </article>
      <AppFooter />
    </main>
  );
}

export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-white">{heading}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}
