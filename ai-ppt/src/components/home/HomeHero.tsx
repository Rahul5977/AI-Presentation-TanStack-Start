import { Sparkles } from 'lucide-react'

type HomeHeroProps = {
  firstName?: string
}

export default function HomeHero({ firstName }: HomeHeroProps) {
  const displayName = firstName?.trim() || 'there'

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/85 p-7 shadow-2xl shadow-black/5 ring-1 ring-white/10 backdrop-blur sm:p-9 dark:shadow-black/30">
      <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative max-w-3xl">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="size-3.5" />
          AI presentation studio
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Hey {displayName}, build a sharper deck in minutes.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Start with a clear prompt, tune the audience and visual direction,
          then generate a presentation draft that feels ready for review.
        </p>
      </div>
    </section>
  )
}
