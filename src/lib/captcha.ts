/**
 * Bot protection for the sign-up and sign-in forms.
 *
 * The provider is picked by whichever secret is configured, so one code path
 * serves Cloudflare Turnstile (free, no Google account needed) and Google
 * reCAPTCHA:
 *
 *   TURNSTILE_SECRET_KEY   -> turnstile
 *   RECAPTCHA_SECRET_KEY   -> recaptcha
 *
 * The token the widget puts in the form is checked server-side against the
 * vendor's siteverify endpoint, so a script that skips the widget cannot get in.
 * With no secret configured the check is skipped and warned about once, which
 * keeps a fresh clone and local development working — set the secret on the
 * deployment or the forms stay unprotected.
 */

const VERIFY_URL = {
  turnstile: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
  recaptcha: "https://www.google.com/recaptcha/api/siteverify",
} as const;

export type CaptchaProvider = keyof typeof VERIFY_URL;

export function captchaProvider(): CaptchaProvider | null {
  if ((process.env.TURNSTILE_SECRET_KEY || "").trim()) return "turnstile";
  if ((process.env.RECAPTCHA_SECRET_KEY || "").trim()) return "recaptcha";
  return null;
}

let warned = false;

/**
 * Verifies a widget token. A missing token, a rejected token and an unreachable
 * vendor all block the request; only "no secret configured" lets it through.
 */
export async function verifyCaptcha(
  token: string,
  ip: string,
): Promise<{ ok: boolean; reason: string }> {
  const provider = captchaProvider();
  if (!provider) {
    if (!warned) {
      warned = true;
      console.warn(
        "[captcha] TURNSTILE_SECRET_KEY / RECAPTCHA_SECRET_KEY is not set — bot checks are skipped",
      );
    }
    return { ok: true, reason: "not configured" };
  }
  if (!token) return { ok: false, reason: "missing" };

  const secret =
    (provider === "turnstile"
      ? process.env.TURNSTILE_SECRET_KEY
      : process.env.RECAPTCHA_SECRET_KEY) || "";

  const body = new URLSearchParams({ secret, response: token });
  if (ip && ip !== "local") body.set("remoteip", ip);

  try {
    const res = await fetch(VERIFY_URL[provider], {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as { success?: boolean } | null;
    if (data?.success) return { ok: true, reason: "verified" };
    console.warn(`[captcha] ${provider} rejected a token`);
    return { ok: false, reason: "rejected" };
  } catch (error) {
    console.error("[captcha] siteverify failed", error);
    return { ok: false, reason: "unreachable" };
  }
}

/** User-facing text for a failed check — never leaks why it failed. */
export function captchaError(reason: string) {
  return reason === "missing"
    ? "Please complete the bot check and try again."
    : "The bot check could not be verified. Reload the page and try again.";
}
