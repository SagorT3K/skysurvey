import LegalPage, { Section } from "@/components/LegalPage";

export const metadata = { title: "Cookie Policy — SkySurvey" };

export default function CookiesPage() {
  return (
    <LegalPage title="Cookie Policy" updated="September 2, 2026">
      <p>
        This policy explains how SkySurvey uses cookies and similar technologies, and how you can
        control them. For details on how we handle personal data generally, see our{" "}
        <a href="/privacy" className="font-semibold text-coffee-700 underline">Privacy Policy</a>.
      </p>

      <Section heading="1. What are cookies?">
        <p>
          Cookies are small text files stored on your device. We also use similar technologies such
          as localStorage. Together they help websites work, remember preferences, and measure how
          they are used.
        </p>
      </Section>

      <Section heading="2. Categories we use">
        <ul className="list-disc space-y-3 pl-5">
          <li>
            <b>Strictly necessary (always active).</b> Required for the site to function: your login
            session cookie (<code className="rounded bg-coffee-100 px-1.5 py-0.5 text-xs">ss_token</code>),
            security and fraud-prevention signals, and your cookie-consent choice. These cannot be
            switched off.
          </li>
          <li>
            <b>Analytics (optional).</b> Help us understand which pages are used so we can improve
            the Service. Data is aggregated where possible.
          </li>
          <li>
            <b>Preference (optional).</b> Remember choices such as your display settings.
          </li>
        </ul>
      </Section>

      <Section heading="3. Managing cookies">
        <p>
          When you first visit, a banner lets you accept all cookies or essential-only; you can
          change your choice any time by clearing site data in your browser. You can also block or
          delete cookies through your browser settings — but note that removing strictly necessary
          cookies will prevent you from signing in and using SkySurvey.
        </p>
      </Section>

      <Section heading="4. Third-party cookies">
        <p>
          When you click a survey you may leave SkySurvey and visit a research partner&apos;s website,
          which may set its own cookies under its own policy. We recommend reviewing partner privacy
          notices before completing surveys.
        </p>
      </Section>

      <Section heading="5. Contact">
        <p>
          Questions? Email{" "}
          <a href="mailto:privacy@skysurvey.com" className="font-semibold text-coffee-700 underline">
            privacy@skysurvey.com
          </a>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
