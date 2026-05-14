import LegalPage from '@/components/legal/LegalPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/contact-us')({
  component: ContactPage,
})

function ContactPage() {
  return (
    <LegalPage
      title="Contact Us"
      description="For support, billing, and general queries related to Kodexa, please use the details below."
    >
      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">
          Registered Address
        </h2>
        <p>
          Kodexa
          <br />
          2nd Floor, Innovation Hub
          <br />
          HSR Layout, Sector 2
          <br />
          Bengaluru, Karnataka 560102
          <br />
          India
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">
          Support Email
        </h2>
        <p>
          <a
            className="text-primary underline underline-offset-4"
            href="mailto:rahul.raj.dev9237@gmail.com"
          >
            rahul.raj.dev9237@gmail.com
          </a>
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Phone</h2>
        <p>
          <a
            className="text-primary underline underline-offset-4"
            href="tel:+918210352783"
          >
            +91 8210352783
          </a>
        </p>
      </section>
    </LegalPage>
  )
}
