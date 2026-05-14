import type { ReactNode } from 'react'

type LegalPageProps = {
  title: string
  description?: string
  children: ReactNode
}

export default function LegalPage({ title, description, children }: LegalPageProps) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <article className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-sm sm:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description ? (
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
          ) : null}
        </header>
        <div className="space-y-6 text-sm leading-7 text-muted-foreground">{children}</div>
      </article>
    </main>
  )
}
