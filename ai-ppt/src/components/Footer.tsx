import { KodexaLogoMark, KodexaWordmark } from '@/components/brand/KodexaLogo'
import { Link } from '@tanstack/react-router'

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

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-20 border-t border-border/50 bg-card/30 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md space-y-3">
            <div className="inline-flex items-center gap-2.5">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <KodexaLogoMark className="size-7" />
              </span>
              <p className="text-lg font-semibold">
                <KodexaWordmark />
              </p>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              AI-powered presentation studio. Build decks that impress, in minutes.
            </p>
            <p className="inline-flex items-center gap-2 text-xs text-emerald-500">
              <span className="size-2 rounded-full bg-emerald-500" />
              Free to start · Pro from $9/mo
            </p>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Legal & Info
            </p>
            <nav aria-label="Legal links" className="flex flex-col gap-2.5">
              {legalLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-border/60 pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Kodexa.ai · Built with ✨ by Rahul Raj</p>
          <p>Powered by AI · Secured by Razorpay</p>
        </div>
      </div>
    </footer>
  )
}