import LegalPage from '@/components/legal/LegalPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/terms-and-conditions')({
  component: TermsPage,
})

function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      description="Please read these terms carefully before using Kodexa."
    >
      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
        <p>
          By accessing or using Kodexa, you agree to be bound by these Terms & Conditions.
          If you do not agree, please discontinue use of the platform.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">2. Services</h2>
        <p>
          Kodexa offers software tooling including AI-assisted workflows, code execution
          support, and related digital services. We may update, improve, or discontinue
          features at our discretion.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">3. User Responsibilities</h2>
        <p>
          You agree to provide accurate account information, maintain account security, and
          use the platform only for lawful purposes. You are solely responsible for content
          and code submitted through your account.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">4. Payments and Billing</h2>
        <p>
          Paid features are billed in Indian Rupees (INR). By purchasing a paid service, you
          authorize us and our payment partners to process the transaction. Pricing may be
          revised with prior notice on the platform.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">5. Intellectual Property</h2>
        <p>
          All trademarks, software, designs, and platform materials on Kodexa are owned by
          or licensed to us. You may not reproduce, distribute, or reverse engineer the
          platform except as allowed by law.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">6. Limitation of Liability</h2>
        <p>
          Kodexa is provided on an &quot;as is&quot; and &quot;as available&quot; basis. We do not
          guarantee uninterrupted availability or error-free operation. To the maximum extent
          permitted by law, we are not liable for indirect, incidental, or consequential
          damages arising from platform use.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">7. Governing Law</h2>
        <p>
          These terms are governed by the laws of India. Any disputes shall be subject to the
          exclusive jurisdiction of courts in Bengaluru, Karnataka.
        </p>
      </section>
    </LegalPage>
  )
}
