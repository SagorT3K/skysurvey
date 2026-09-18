"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => string; reset: (id?: string) => void };
    grecaptcha?: { render: (el: HTMLElement, opts: Record<string, unknown>) => number; reset: (id?: number) => void };
  }
}

const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";
const RECAPTCHA_SRC = "https://www.google.com/recaptcha/api.js?render=explicit";

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`failed to load ${src}`));
    document.head.appendChild(s);
  });
}

/**
 * Bot-check widget. Renders Cloudflare Turnstile when
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, else reCAPTCHA v2 checkbox when
 * NEXT_PUBLIC_RECAPTCHA_SITE_KEY is set, else nothing (dev mode — the
 * server skips verification until a secret is configured).
 */
export default function CaptchaWidget({
  onToken,
  theme = "light",
}: {
  onToken: (token: string | null) => void;
  theme?: "light" | "dark";
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const tokenRef = useRef(onToken);
  useEffect(() => {
    tokenRef.current = onToken;
  }, [onToken]);

  const turnstileKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
  const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";
  const provider = turnstileKey ? "turnstile" : recaptchaKey ? "recaptcha" : null;

  useEffect(() => {
    if (!provider) return;
    let cancelled = false;
    let widgetId: string | number | undefined;

    (async () => {
      try {
        if (provider === "turnstile") {
          await loadScript(TURNSTILE_SRC);
          if (cancelled || !boxRef.current || !window.turnstile) return;
          boxRef.current.innerHTML = "";
          widgetId = window.turnstile.render(boxRef.current, {
            sitekey: turnstileKey,
            theme,
            callback: (t: string) => tokenRef.current(t),
            "expired-callback": () => tokenRef.current(null),
            "error-callback": () => tokenRef.current(null),
          });
        } else {
          await loadScript(RECAPTCHA_SRC);
          if (cancelled || !boxRef.current || !window.grecaptcha) return;
          boxRef.current.innerHTML = "";
          widgetId = window.grecaptcha.render(boxRef.current, {
            sitekey: recaptchaKey,
            theme,
            callback: (t: string) => tokenRef.current(t),
            "expired-callback": () => tokenRef.current(null),
            "error-callback": () => tokenRef.current(null),
          });
        }
      } catch {
        // Widget failed to load (offline, blocker): leave the box empty and
        // let the server's error message explain the retry.
      }
    })();

    return () => {
      cancelled = true;
      try {
        if (provider === "turnstile" && typeof widgetId === "string") window.turnstile?.reset(widgetId);
        else if (provider === "recaptcha" && typeof widgetId === "number") window.grecaptcha?.reset(widgetId);
      } catch {
        // ignore reset errors on unmount
      }
      tokenRef.current(null);
    };
  }, [provider, turnstileKey, recaptchaKey, theme]);

  if (!provider) return null;
  return <div ref={boxRef} className="flex justify-start" />;
}
