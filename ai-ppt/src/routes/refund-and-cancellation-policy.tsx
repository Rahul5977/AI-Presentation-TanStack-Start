import LegalPage from '@/components/legal/LegalPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/refund-and-cancellation-policy')({
  component: RefundPolicyPage,
})

function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund & Cancellation Policy"
      description="This policy explains how payments and cancellations are handled on Kodexa."
    >
      <section>
        <p>
          As Kodexa provides digital services, we do not offer refunds once a subscription
          or service is purchased. In the event of a failed transaction where the amount is
          debited but the service is not activated, the amount will be refunded to the
          original payment method within 5-7 business days.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Cancellation</h2>
        <p>
          Users may cancel future renewals at any time through their account settings, when
          available. Cancellation stops charges for future billing cycles and does not
          provide retrospective refunds for previously billed periods.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Support for Payment Issues</h2>
        <p>
          If you face a duplicate charge, delayed activation, or other payment issue, please
          contact us at{' '}
          <a
            className="text-primary underline underline-offset-4"
            href="mailto:rahul.rajdev9237@gmail.com"
          >
            rahul.rajdev9237@gmail.com
          </a>{' '}
          with your payment reference details.
        </p>
      </section>
    </LegalPage>
  )
}
