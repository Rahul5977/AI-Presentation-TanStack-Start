import LegalPage from '@/components/legal/LegalPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about-us')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <LegalPage
      title="About Us"
      description="Kodexa is built to make learning, building, and shipping software faster and more reliable."
    >
      <section>
        <p>
          Kodexa is a scalable code execution platform and multi-agent learning assistant
          designed for developers, students, and technical teams. Our platform helps users
          transform ideas into working outputs through intelligent workflows, guided code
          generation, and practical execution support.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">About the Owner</h2>
        <p>
          Kodexa is created by Rahul, an undergraduate student at IIT Bhilai, with a focus
          on practical AI products that solve real developer and learner problems.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Why This Project Was Made</h2>
        <p>
          This project was built to reduce the gap between learning and shipping. Many users
          struggle with fragmented tools while studying AI, coding, and presentation design.
          Kodexa combines intelligent assistance, code execution support, and workflow
          automation in one place so users can learn faster and deliver results confidently.
        </p>
      </section>
    </LegalPage>
  )
}
