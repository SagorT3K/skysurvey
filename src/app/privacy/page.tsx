import LegalPage, { Section } from "@/components/LegalPage";

export const metadata = { title: "Privacy Policy — SkySurvey" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="September 2, 2026">
      <p>
        SkySurvey (“we”, “us”) respects your privacy. This policy explains what personal data we
        collect, why we collect it, how we use and share it, and the rights you have. It applies to
        users in the US, UK, Canada, France and all other countries where the Service is available.
        For UK/EU users, this policy also serves as our GDPR notice; for California residents, it
        covers CCPA/CPRA rights.
      </p>

      <Section heading="1. Data we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li><b>Account data:</b> email address, display name, password (hashed), country of residence.</li>
          <li><b>Reward data:</b> PayPal payout address you provide, coin balance and transaction history, redemption requests.</li>
          <li><b>Survey data:</b> profile answers and qualification responses you provide, and information returned by our research partners about surveys you start or complete.</li>
          <li><b>Technical data:</b> IP address, browser/device type, approximate location derived from IP, and fraud-prevention signals such as VPN/proxy detection. We do not knowingly collect data from anyone under 18.</li>
        </ul>
      </Section>

      <Section heading="2. How we use your data">
        <ul className="list-disc space-y-2 pl-5">
          <li>To create and manage your account and calculate your rewards.</li>
          <li>To match you with suitable surveys and pass necessary profile data (such as country and demographics) to survey partners so they can present relevant surveys.</li>
          <li>To detect and prevent fraud, duplicate accounts, and survey abuse.</li>
          <li>To process redemptions and provide support.</li>
          <li>To comply with legal obligations.</li>
        </ul>
        <p>
          Our legal bases for UK/EU users: performance of a contract (operating your account and
          rewards), legitimate interests (fraud prevention, service improvement), and consent (e.g.
          optional cookies, marketing communications).
        </p>
      </Section>

      <Section heading="3. Sharing">
        <p>
          We share limited data with: <b>market research partners</b> (survey routers and panels) who
          need it to route you to surveys and validate completions; <b>payment providers</b> (e.g.
          PayPal) to deliver your rewards; and <b>service providers</b> hosting our infrastructure.
          We never sell your personal data, and survey answers you give to partners are governed by
          their privacy policies — research responses are generally reported in aggregate and are
          not used to advertise to you individually.
        </p>
      </Section>

      <Section heading="4. Retention">
        <p>
          We keep account and transaction data while your account is active and for up to 5 years
          afterwards to meet tax, fraud-prevention and legal requirements. You may request deletion
          earlier (see your rights below), subject to these obligations.
        </p>
      </Section>

      <Section heading="5. Your rights">
        <p>
          Depending on your location you may have the right to access, correct, export or delete
          your personal data, object to or restrict certain processing, and withdraw consent. UK/EU
          users may complain to their data protection authority; California residents may exercise
          know/delete/opt-out rights without discrimination. To exercise any right, email{" "}
          <a href="mailto:privacy@skysurvey.com" className="font-semibold text-coffee-700 underline">
            privacy@skysurvey.com
          </a>
          . We respond within 30 days.
        </p>
      </Section>

      <Section heading="6. Security">
        <p>
          We use industry-standard measures including encrypted connections (TLS), hashed passwords,
          and access controls. No system is perfectly secure; please use a unique password for your
          account.
        </p>
      </Section>

      <Section heading="7. Contact">
        <p>
          Privacy questions? Contact our privacy team at{" "}
          <a href="mailto:privacy@skysurvey.com" className="font-semibold text-coffee-700 underline">
            privacy@skysurvey.com
          </a>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
