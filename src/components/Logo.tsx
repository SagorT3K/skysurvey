import Link from "next/link";
import { Coffee } from "lucide-react";

type LogoProps = {
  href?: string;
  tone?: "light" | "dark";
  size?: "sm" | "md";
  label?: string;
};

/** Brand mark used in every header and footer. `tone` refers to the background it sits on. */
export default function Logo({
  href = "/",
  tone = "light",
  size = "md",
  label = "SkySurvey",
}: LogoProps) {
  const box = size === "sm" ? "h-8 w-8 rounded-lg" : "h-9 w-9 rounded-xl";
  const glyph = size === "sm" ? 16 : 18;
  const text = size === "sm" ? "text-base" : "text-xl";

  const inner = (
    <span className="flex items-center gap-2.5">
      <span
        className={`flex ${box} items-center justify-center ${
          tone === "dark" ? "bg-coffee-400 text-coffee-950" : "bg-coffee-700 text-white"
        }`}
      >
        <Coffee size={glyph} strokeWidth={2.25} aria-hidden="true" />
      </span>
      <span
        className={`${text} font-bold tracking-tight ${
          tone === "dark" ? "text-white" : "text-coffee-800"
        }`}
      >
        {label}
      </span>
    </span>
  );

  if (!href) return inner;
  return (
    <Link href={href} className="inline-flex items-center">
      {inner}
    </Link>
  );
}
