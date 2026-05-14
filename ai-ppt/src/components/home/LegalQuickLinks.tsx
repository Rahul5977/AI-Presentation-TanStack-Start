import { Link } from '@tanstack/react-router'
import { Scale } from 'lucide-react'

const legalLinks = [
  { to: '/about-us', label: 'About Us' },
  { to: '/contact-us', label: 'Contact Us' },
  { to: '/privacy-policy', label: 'Privacy Policy' },
  { to: '/terms-and-conditions', label: 'Terms & Conditions' },
  {
    to: '/refund-and-cancellation-policy',
    label: 'Refund & Cancellation Policy',
  },
] as const

export default function LegalQuickLinks() {
  return (
    <section className="rounded-2xl border border-border/70 bg-card/80 p-4 sm:p-5">
      <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <Scale className="size-3.5" />
        Legal & Compliance
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {legalLinks.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="rounded-xl border border-border/60 bg-background/60 px-3 py-1.5 text-xs text-foreground transition-all duration-150 hover:border-primary/30 hover:bg-muted/60"
          >
            {item.label}
          </Link>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">© 2026 Rahul Raj</p>
    </section>
  )
}
