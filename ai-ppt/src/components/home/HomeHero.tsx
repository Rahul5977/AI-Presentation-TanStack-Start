import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

type HomeHeroProps = {
  firstName?: string
}

export default function HomeHero({ firstName }: HomeHeroProps) {
  const displayName = firstName?.trim()
  const stats = [
    { value: '50K+', label: 'Slides generated' },
    { value: '< 2 min', label: 'Avg. creation time' },
    { value: '4 styles', label: 'Templates' },
  ] as const

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-7 shadow-2xl shadow-black/15 backdrop-blur-xl sm:p-9"
    >
      <motion.div
        className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-primary/20 blur-3xl"
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-14 -left-12 h-40 w-40 rounded-full bg-primary/15 blur-3xl"
        animate={{ scale: [1.05, 0.95, 1.05], opacity: [0.25, 0.4, 0.25] }}
        transition={{ duration: 7.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '14px 14px',
        }}
      />

      <div className="relative max-w-4xl">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" />
            AI Presentation Studio
          </span>
          {['AI-Powered', 'Multi-language', 'Instant export'].map((pill) => (
            <span
              key={pill}
              className="rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-[11px] font-medium text-muted-foreground"
            >
              {pill}
            </span>
          ))}
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {displayName ? (
            <>
              Hey <span className="gradient-text">{displayName}</span>, build a sharper deck in
              minutes.
            </>
          ) : (
            <>
              Build sharper decks <span className="gradient-text">in minutes</span>
            </>
          )}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Start with a clear prompt, tune audience and tone, then generate a presentation
          draft that feels polished from slide one.
        </p>
        <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-500">
          <span className="size-2 rounded-full bg-emerald-500" />
          Free to start · Upgrade to Pro for more
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          {stats.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-border/60 bg-background/55 px-4 py-3"
            >
              <p className="text-base font-semibold text-foreground">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  )
}
