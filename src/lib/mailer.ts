/**
 * Transactional email, sent through Brevo's HTTP API so a serverless host needs
 * neither an SMTP library nor an outbound SMTP port.
 *
 *   BREVO_API_KEY    Brevo -> SMTP & API -> API keys
 *   MAIL_FROM_EMAIL  a sender verified in Brevo. No domain is required: a Gmail
 *                    address works once Brevo's single-sender confirmation is clicked
 *   MAIL_FROM_NAME   display name (default SkySurvey)
 *
 * Without an API key the message is printed to the server log instead, so local
 * development can still read the code; in production the caller is told delivery
 * is unavailable rather than the mail being dropped silently.
 */

export function mailerConfigured() {
  return Boolean((process.env.BREVO_API_KEY || "").trim());
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<{ ok: boolean; reason: string }> {
  const apiKey = (process.env.BREVO_API_KEY || "").trim();
  const fromEmail = (process.env.MAIL_FROM_EMAIL || "noreply@skysurvey.com").trim();
  const fromName = (process.env.MAIL_FROM_NAME || "SkySurvey").trim();

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      console.error("[mail] BREVO_API_KEY is not set — not sending, callers must fail loudly");
      return { ok: false, reason: "not-configured" };
    }
    console.log(`[mail:dev] to=${opts.to} subject="${opts.subject}"\n${opts.text}`);
    return { ok: true, reason: "logged" };
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: fromEmail, name: fromName },
        to: [{ email: opts.to }],
        subject: opts.subject,
        htmlContent: opts.html,
        textContent: opts.text,
      }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[mail] Brevo returned ${res.status}: ${detail.slice(0, 300)}`);
      return { ok: false, reason: `brevo-${res.status}` };
    }
    return { ok: true, reason: "sent" };
  } catch (error) {
    console.error("[mail] Brevo request failed", error);
    return { ok: false, reason: "unreachable" };
  }
}
