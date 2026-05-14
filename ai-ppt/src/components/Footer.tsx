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
  return (
    <footer className="mt-16 border-t border-border/70 bg-card/40 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <nav
          aria-label="Legal links"
          className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground"
        >
          {legalLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="text-sm text-muted-foreground">© 2026 Rahul Raj</p>
      </div>
    </footer>
  )
}