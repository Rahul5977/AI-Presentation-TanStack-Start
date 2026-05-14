import LegalPage from '@/components/legal/LegalPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/privacy-policy')({
  component: PrivacyPolicyPage,
})

function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="This policy describes how Kodexa collects, uses, and protects your information."
    >
      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">
          1. Data We Collect
        </h2>
        <p>
          We may collect information including your name, email address,
          authentication provider details, billing transaction identifiers,
          usage analytics, and content you submit to use Kodexa services.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">
          2. How We Use Data
        </h2>
        <p>
          We use collected data to provide and improve services, authenticate
          users, process payments, prevent abuse, support users, and comply with
          applicable legal obligations.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">
          3. Data Protection
        </h2>
        <p>
          Kodexa uses industry-standard safeguards such as encrypted transport
          (HTTPS), access controls, and secure infrastructure practices to
          protect user data from unauthorized access, loss, or misuse.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">
          4. Data Sharing
        </h2>
        <p>
          We do not sell personal data. Information may be shared only with
          trusted service providers (such as payment processors and
          infrastructure vendors) strictly for operating the platform, and only
          under appropriate confidentiality and security safeguards.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">
          5. Data Retention
        </h2>
        <p>
          We retain data only as long as necessary for service delivery, legal
          compliance, dispute resolution, and enforcement of agreements.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">
          6. Contact
        </h2>
        <p>
          For privacy-related requests, contact us at{' '}
          <a
            className="text-primary underline underline-offset-4"
            href="mailto:rahul.raj.dev9237@gmail.com"
          >
            rahul.raj.dev9237@gmail.com
          </a>
          .
        </p>
      </section>
    </LegalPage>
  )
}
