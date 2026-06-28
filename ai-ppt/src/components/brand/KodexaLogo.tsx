import { cn } from '@/lib/utils'

type KodexaLogoMarkProps = {
  className?: string
  variant?: 'onPrimary' | 'default'
}

/**
 * Kodexa mark: three skewed “slides” + spark — reads as decks / ideas, scales to favicon size.
 */
export function KodexaLogoMark({ className, variant = 'default' }: KodexaLogoMarkProps) {
  const a = variant === 'onPrimary' ? 'hsl(var(--primary-foreground))' : 'hsl(var(--primary))'
  const b = variant === 'onPrimary' ? 'hsl(var(--primary-foreground) / 0.72)' : 'hsl(var(--primary) / 0.72)'
  const c = variant === 'onPrimary' ? 'hsl(var(--primary-foreground) / 0.48)' : 'hsl(var(--primary) / 0.48)'

  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <path d="M6 11 26 7 28 13 8 17Z" fill={c} />
      <path d="M7 18 27 14 29 20 9 24Z" fill={b} />
      <path d="M8 25 30 20 32 27 10 32Z" fill={a} />
      <circle cx="31" cy="9" r="4" fill={a} />
    </svg>
  )
}

export function KodexaWordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-baseline gap-0 font-semibold tracking-tight', className)}>
      <span className="text-foreground">kodexa</span>
      <span className="text-primary">.ai</span>
    </span>
  )
}
