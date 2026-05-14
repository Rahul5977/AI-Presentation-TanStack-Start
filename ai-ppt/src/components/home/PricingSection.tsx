import { motion } from 'framer-motion'
import { Check, Layers, Sparkles, Zap } from 'lucide-react'

const pricingTiers = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for your first deck',
    price: '₹0',
    note: 'One-time free deck',
    Icon: Sparkles,
    highlighted: false,
    features: ['1 deck included', 'All core templates', 'AI-assisted outline'],
  },
  {
    id: 'credit',
    name: 'Deck Credit',
    description: 'Continue creating on demand',
    price: '₹20',
    note: 'per additional deck',
    Icon: Zap,
    highlighted: true,
    features: ['Pay only when needed', 'Full generation pipeline', 'History + editing access'],
  },
] as const

export default function PricingSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-7"
    >
      <div className="mb-5">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <Layers className="size-3.5" />
          Pricing
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
          Transparent pay-as-you-go
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          No subscriptions. Clear pricing in Indian Rupees.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {pricingTiers.map((tier) => (
          <article
            key={tier.id}
            className={
              tier.highlighted
                ? 'relative rounded-2xl border border-primary/50 bg-primary/5 p-5 shadow-lg shadow-primary/10'
                : 'relative rounded-2xl border border-border/70 bg-background/65 p-5'
            }
          >
            {tier.highlighted ? (
              <span className="absolute -top-2 right-4 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                Most popular
              </span>
            ) : null}
            <div className="mb-4 flex items-center gap-3">
              <span
                className={
                  tier.highlighted
                    ? 'inline-flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary'
                    : 'inline-flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground'
                }
              >
                <tier.Icon className="size-4.5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{tier.name}</p>
                <p className="text-xs text-muted-foreground">{tier.description}</p>
              </div>
            </div>

            <p className="text-3xl font-semibold tracking-tight text-foreground">{tier.price}</p>
            <p className="text-xs text-muted-foreground">{tier.note}</p>

            <ul className="mt-4 space-y-2">
              {tier.features.map((feature) => (
                <li key={feature} className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className={
                      tier.highlighted
                        ? 'inline-flex size-4 items-center justify-center rounded-full bg-primary/15 text-primary'
                        : 'inline-flex size-4 items-center justify-center rounded-full bg-muted text-muted-foreground'
                    }
                  >
                    <Check className="size-2.5" />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <p className="mt-4 inline-flex items-center gap-2 text-xs text-emerald-500">
        <span className="size-2 rounded-full bg-emerald-500" />
        No subscriptions · No hidden fees · Secured by Razorpay
      </p>
    </motion.section>
  )
}
