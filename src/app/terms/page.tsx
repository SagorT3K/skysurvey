import LegalPage, { Section } from "@/components/LegalPage";

export const metadata = { title: "Terms & Conditions — SkySurvey" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms & Conditions" updated="September 2, 2026">
      <p>
        Welcome to SkySurvey (“SkySurvey”, “we”, “us”). These Terms &amp; Conditions govern your
        access to and use of the SkySurvey website and any related services (the “Service”). By
        creating an account or using the Service you agree to be bound by these Terms. If you do
        not agree, do not use the Service.
      </p>

      <Section heading="1. Eligibility">
        <p>
          You must be at least 18 years old, or the age of majority in your jurisdiction, to use the
          Service. The Service is intended for residents of the United States, the United Kingdom,
          Canada, France and other countries we designate as supported. You must reside in, and
          access the Service from, a supported country. One account per person; duplicate accounts
          are prohibited.
        </p>
      </Section>

      <Section heading="2. Accounts">
        <p>
          You agree to provide accurate, current and complete information when registering and to
          keep it up to date. You are responsible for safeguarding your password and for all
          activity under your account. We may suspend or terminate accounts that violate these
          Terms, provide false information, or that we reasonably believe involve fraud, automation,
          VPN/proxy masking of your true location, or other abuse.
        </p>
      </Section>

      <Section heading="3. Earning coins">
        <p>
          Coins are earned by completing surveys and other qualifying actions offered through the
          Service. Survey credit is subject to validation by our market research partners. Surveys
          may be reversed (and corresponding coins deducted, including from a negative balance) if a
          partner rejects the underlying response for quality, duplication, inconsistency, or
          suspected fraud. Coins credited from surveys become withdrawable immediately.
        </p>
      </Section>

      <Section heading="4. Coins, redemption and payments">
        <p>
          Coins are a promotional loyalty point with no cash value until redeemed in accordance with
          these Terms. The conversion rate (currently 1 coin = $0.01) and the minimum redemption
          threshold (currently 500 coins) are set by us and may change. Redemption requests stay
          Pending while we review them and are released via PayPal, gift cards or crypto once
          verified; the user sees the release time on the request. We may refuse or reverse
          redemptions obtained through fraud, multi-accounting, or other abuse, and may demand the
          return of amounts paid in error. You are responsible for any taxes on rewards you receive.
        </p>
      </Section>

      <Section heading="5. Acceptable use">
        <p>
          You agree not to: use bots, scripts, emulators or automation; create multiple accounts;
          misrepresent your identity, age, country of residence or demographic profile; use VPNs,
          proxies or similar tools to mask your location; attempt to complete the same survey more
          than once; interfere with the Service; or resell access to the Service.
        </p>
      </Section>

      <Section heading="6. Account holds and suspension">
        <p>
          If we detect — or reasonably suspect — a violation of these Terms, including the use of
          bots, automation, VPNs or proxies to complete surveys, we may place the account on hold
          for a fixed period or suspend it permanently. A hold prevents the account from earning
          for the stated duration; the user is shown the remaining time on their account pages.
          Holds and suspensions may take effect without prior notice where required to protect the
          integrity of the program. Coins already released as payouts are not affected; pending
          redemption requests may be rejected if the underlying earnings violate these Terms.
        </p>
      </Section>

      <Section heading="7. Third-party surveys">
        <p>
          Surveys are supplied by third-party market research companies. When you start a survey you
          may be redirected to a partner website whose terms and privacy practices apply. We are not
          responsible for third-party content or practices.
        </p>
      </Section>

      <Section heading="8. Termination">
        <p>
          We may modify, suspend or discontinue the Service, or any part of it, at any time. We may
          terminate your account for any breach of these Terms. Upon termination for breach, any
          pending or unwithdrawn coins may be forfeited.
        </p>
      </Section>

      <Section heading="9. Disclaimer and limitation of liability">
        <p>
          The Service is provided “as is” without warranties of any kind. To the maximum extent
          permitted by law, SkySurvey shall not be liable for indirect, incidental, special or
          consequential damages, and our total liability arising out of or relating to the Service
          shall not exceed the greater of (a) the value of rewards you have redeemed in the 12
          months preceding the claim or (b) USD $50.
        </p>
      </Section>

      <Section heading="10. Changes to these Terms">
        <p>
          We may update these Terms from time to time. We will post the revised version on this page
          with a new “Last updated” date. Continued use of the Service after changes take effect
          constitutes acceptance of the revised Terms.
        </p>
      </Section>

      <Section heading="11. Contact">
        <p>
          Questions about these Terms? Contact us at{" "}
          <a href="mailto:support@skysurvey.com" className="font-semibold text-coffee-700 underline">
            support@skysurvey.com
          </a>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
