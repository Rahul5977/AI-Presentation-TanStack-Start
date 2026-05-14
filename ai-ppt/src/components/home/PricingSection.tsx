const pricingRows = [
  {
    title: 'Starter Access',
    detail: 'First presentation deck',
    price: '₹0',
  },
  {
    title: 'Deck Credit',
    detail: 'Each additional presentation deck',
    price: '₹20',
  },
] as const

export default function PricingSection() {
  return (
    <section className="rounded-3xl border border-border/70 bg-card/80 p-6 sm:p-7">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">Pricing</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Transparent pay-as-you-grow pricing in Indian Rupees.
      </p>
      <div className="mt-5 space-y-3">
        {pricingRows.map((row) => (
          <article
            key={row.title}
            className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/70 px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{row.title}</p>
              <p className="text-xs text-muted-foreground">{row.detail}</p>
            </div>
            <p className="text-lg font-semibold text-foreground">{row.price}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
