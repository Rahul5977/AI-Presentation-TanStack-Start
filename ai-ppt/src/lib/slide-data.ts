import { z } from 'zod'

// ─── rich slide data model ───────────────────────────────────────────────────
//
// A slide may carry an optional structured `slideData` payload that renders as a
// chart, table, timeline, or metric callouts instead of (or alongside) bullets.
// The same model is the single source of truth for the React renderer, the PPTX
// exporter, and AI generation, so the four surfaces never drift.

const chartSchema = z.object({
  kind: z.literal('chart'),
  chartType: z.enum(['bar', 'line', 'pie']),
  title: z.string().trim().max(120).optional(),
  categories: z.array(z.string().trim().max(60)).min(1).max(12),
  series: z
    .array(
      z.object({
        name: z.string().trim().max(60),
        values: z.array(z.number()).min(1).max(12),
      }),
    )
    .min(1)
    .max(6),
})

const tableSchema = z.object({
  kind: z.literal('table'),
  title: z.string().trim().max(120).optional(),
  columns: z.array(z.string().trim().max(60)).min(1).max(8),
  rows: z.array(z.array(z.string().trim().max(240)).min(1).max(8)).min(1).max(14),
})

const timelineSchema = z.object({
  kind: z.literal('timeline'),
  title: z.string().trim().max(120).optional(),
  events: z
    .array(
      z.object({
        label: z.string().trim().max(48),
        title: z.string().trim().max(100),
        description: z.string().trim().max(240).optional(),
      }),
    )
    .min(1)
    .max(8),
})

const metricsSchema = z.object({
  kind: z.literal('metrics'),
  title: z.string().trim().max(120).optional(),
  items: z
    .array(
      z.object({
        value: z.string().trim().max(24),
        label: z.string().trim().max(72),
        caption: z.string().trim().max(96).optional(),
      }),
    )
    .min(1)
    .max(6),
})

export const slideDataSchema = z.discriminatedUnion('kind', [
  chartSchema,
  tableSchema,
  timelineSchema,
  metricsSchema,
])

export type SlideData = z.infer<typeof slideDataSchema>
export type SlideDataKind = SlideData['kind']
export type ChartSlideData = z.infer<typeof chartSchema>
export type TableSlideData = z.infer<typeof tableSchema>
export type TimelineSlideData = z.infer<typeof timelineSchema>
export type MetricsSlideData = z.infer<typeof metricsSchema>

export const SLIDE_DATA_KINDS: ReadonlyArray<SlideDataKind> = [
  'chart',
  'table',
  'timeline',
  'metrics',
]

/** Hint emitted by outline generation suggesting a slide be visualized. */
export const suggestedVisualSchema = z.enum([
  'none',
  'chart',
  'table',
  'timeline',
  'metrics',
])
export type SuggestedVisual = z.infer<typeof suggestedVisualSchema>

/** Strict parse from a Prisma Json column; returns null when absent/invalid. */
export function parseSlideData(value: unknown): SlideData | null {
  if (value == null) return null
  const result = slideDataSchema.safeParse(value)
  return result.success ? result.data : null
}

/**
 * Tolerant parse for AI output: coerces numeric strings to numbers, drops empty
 * fields, and reshapes common near-miss structures (e.g. `data`/`points`) before
 * validating. Returns null if it still can't be made valid.
 */
export function coerceSlideData(value: unknown): SlideData | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const kind = raw.kind

  if (kind === 'chart') {
    const series = Array.isArray(raw.series)
      ? raw.series.map((s) => {
          const so = (s ?? {}) as Record<string, unknown>
          return {
            name: String(so.name ?? ''),
            values: toNumberArray(so.values ?? so.data ?? so.points),
          }
        })
      : []
    return parseSlideData({
      kind: 'chart',
      chartType: normalizeChartType(raw.chartType),
      title: optionalString(raw.title),
      categories: toStringArray(raw.categories ?? raw.labels),
      series,
    })
  }

  if (kind === 'table') {
    const rows = Array.isArray(raw.rows)
      ? raw.rows.map((r) =>
          Array.isArray(r)
            ? r.map((c) => String(c ?? ''))
            : toStringArray(
                r && typeof r === 'object'
                  ? (r as Record<string, unknown>).cells
                  : undefined,
              ),
        )
      : []
    return parseSlideData({
      kind: 'table',
      title: optionalString(raw.title),
      columns: toStringArray(raw.columns ?? raw.headers),
      rows,
    })
  }

  if (kind === 'timeline') {
    const events = Array.isArray(raw.events)
      ? raw.events.map((e) => {
          const eo = (e ?? {}) as Record<string, unknown>
          return {
            label: String(eo.label ?? eo.date ?? ''),
            title: String(eo.title ?? eo.name ?? ''),
            description: optionalString(eo.description ?? eo.detail),
          }
        })
      : []
    return parseSlideData({ kind: 'timeline', title: optionalString(raw.title), events })
  }

  if (kind === 'metrics') {
    const items = Array.isArray(raw.items)
      ? raw.items.map((i) => {
          const io = (i ?? {}) as Record<string, unknown>
          return {
            value: String(io.value ?? ''),
            label: String(io.label ?? io.name ?? ''),
            caption: optionalString(io.caption ?? io.description),
          }
        })
      : []
    return parseSlideData({ kind: 'metrics', title: optionalString(raw.title), items })
  }

  return null
}

function normalizeChartType(value: unknown): string {
  const v = String(value ?? '').toLowerCase()
  if (v.includes('line')) return 'line'
  if (v.includes('pie') || v.includes('donut')) return 'pie'
  return 'bar'
}

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value
    .map((n) => (typeof n === 'number' ? n : Number(String(n).replace(/[^0-9.-]/g, ''))))
    .filter((n) => Number.isFinite(n))
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((s) => String(s ?? '')).filter((s) => s.length > 0)
}

function optionalString(value: unknown): string | undefined {
  if (value == null) return undefined
  const s = String(value).trim()
  return s.length > 0 ? s : undefined
}
