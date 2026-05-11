import { AUTH_LOGIN_PATH } from '@/lib/auth-path'
import { getSession } from '@/lib/auth-function'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { BarChart3, FileText, Layers, TrendingUp } from 'lucide-react'

type AnalyticsPayload = {
  period: { start: string; end: string }
  summary: {
    decksCreated: number
    slidesGenerated: number
    exports: number
  }
  trends: {
    decksCreated: number
    slidesGenerated: number
    exports: number
  }
}

export const Route = createFileRoute('/analytics')({
  beforeLoad: async ({ location }) => {
    const session = await getSession()
    if (!session) {
      throw redirect({
        to: AUTH_LOGIN_PATH,
        search: { redirect: location.href },
      })
    }
  },
  component: AnalyticsPage,
})

function Trend({ value }: { value: number }) {
  const label = value > 0 ? `+${value}` : String(value)
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        value >= 0
          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
          : 'bg-red-500/15 text-red-600'
      }`}
    >
      <TrendingUp size={11} />
      {label} vs previous month
    </span>
  )
}

function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const response = await fetch('/api/analytics/summary')
        if (!response.ok) throw new Error('Failed to load analytics')
        const payload = (await response.json()) as AnalyticsPayload
        if (!active) return
        setData(payload)
      } finally {
        if (active) setIsLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <header className="mb-6 rounded-3xl border border-border/70 bg-card/90 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Analytics dashboard
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Usage overview
        </h1>
        {data ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Period: {new Date(data.period.start).toLocaleDateString()} -{' '}
            {new Date(data.period.end).toLocaleDateString()}
          </p>
        ) : null}
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading analytics...</p>
      ) : data ? (
        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-border/70 bg-background/80 p-5">
            <div className="mb-2 inline-flex rounded-xl bg-primary/10 p-2 text-primary">
              <FileText size={16} />
            </div>
            <p className="text-sm text-muted-foreground">Decks created</p>
            <p className="mt-1 text-2xl font-semibold">{data.summary.decksCreated}</p>
            <div className="mt-3">
              <Trend value={data.trends.decksCreated} />
            </div>
          </article>

          <article className="rounded-2xl border border-border/70 bg-background/80 p-5">
            <div className="mb-2 inline-flex rounded-xl bg-primary/10 p-2 text-primary">
              <Layers size={16} />
            </div>
            <p className="text-sm text-muted-foreground">Slides generated</p>
            <p className="mt-1 text-2xl font-semibold">{data.summary.slidesGenerated}</p>
            <div className="mt-3">
              <Trend value={data.trends.slidesGenerated} />
            </div>
          </article>

          <article className="rounded-2xl border border-border/70 bg-background/80 p-5">
            <div className="mb-2 inline-flex rounded-xl bg-primary/10 p-2 text-primary">
              <BarChart3 size={16} />
            </div>
            <p className="text-sm text-muted-foreground">Exports</p>
            <p className="mt-1 text-2xl font-semibold">{data.summary.exports}</p>
            <div className="mt-3">
              <Trend value={data.trends.exports} />
            </div>
          </article>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">No analytics data yet.</p>
      )}
    </main>
  )
}
