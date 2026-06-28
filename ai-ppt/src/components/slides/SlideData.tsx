import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from '@/lib/utils'
import type { SlideData } from '@/lib/slide-data'

// Series palette derived from the active slide theme tokens (set on the canvas
// as CSS variables), so charts inherit the deck's brand colors automatically.
const seriesColors = [
  'var(--slide-accent)',
  'var(--slide-foreground)',
  'var(--slide-muted)',
  'color-mix(in srgb, var(--slide-accent) 60%, var(--slide-foreground))',
  'color-mix(in srgb, var(--slide-accent) 30%, var(--slide-muted))',
  'color-mix(in srgb, var(--slide-foreground) 50%, var(--slide-muted))',
]

type SlideDataViewProps = {
  data: SlideData
  className?: string
}

export default function SlideDataView({ data, className }: SlideDataViewProps) {
  return (
    <div className={cn('flex h-full w-full flex-col gap-2', className)}>
      {data.title ? (
        <p
          className="text-(--slide-muted)"
          style={{
            fontFamily: 'var(--slide-font-body)',
            fontSize: 'var(--slide-caption-size)',
          }}
        >
          {data.title}
        </p>
      ) : null}
      <div className="min-h-0 flex-1">
        {data.kind === 'chart' ? <ChartView data={data} /> : null}
        {data.kind === 'table' ? <TableView data={data} /> : null}
        {data.kind === 'timeline' ? <TimelineView data={data} /> : null}
        {data.kind === 'metrics' ? <MetricsView data={data} /> : null}
      </div>
    </div>
  )
}

function ChartView({ data }: { data: Extract<SlideData, { kind: 'chart' }> }) {
  const rows = data.categories.map((category, i) => {
    const row: Record<string, string | number> = { category }
    for (const s of data.series) {
      const v = s.values[i]
      row[s.name] = typeof v === 'number' ? v : 0
    }
    return row
  })

  const axisStyle = { fontFamily: 'var(--slide-font-body)', fill: 'var(--slide-muted)' }

  if (data.chartType === 'pie') {
    const first = data.series[0]
    const pieData = data.categories.map((category, i) => {
      const v = first.values[i]
      return { name: category, value: typeof v === 'number' ? v : 0 }
    })
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={pieData} dataKey="value" nameKey="name" outerRadius="80%" innerRadius="45%">
            {pieData.map((_, i) => (
              <Cell key={i} fill={seriesColors[i % seriesColors.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  if (data.chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--slide-border)" />
          <XAxis dataKey="category" tick={{ fontSize: 10, ...axisStyle }} />
          <YAxis tick={{ fontSize: 10, ...axisStyle }} />
          <Tooltip />
          {data.series.map((s, i) => (
            <Line
              key={s.name}
              type="monotone"
              dataKey={s.name}
              stroke={seriesColors[i % seriesColors.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--slide-border)" vertical={false} />
        <XAxis dataKey="category" tick={{ fontSize: 10, ...axisStyle }} />
        <YAxis tick={{ fontSize: 10, ...axisStyle }} />
        <Tooltip />
        {data.series.map((s, i) => (
          <Bar key={s.name} dataKey={s.name} fill={seriesColors[i % seriesColors.length]} radius={[3, 3, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

function TableView({ data }: { data: Extract<SlideData, { kind: 'table' }> }) {
  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse text-left" style={{ fontFamily: 'var(--slide-font-body)' }}>
        <thead>
          <tr>
            {data.columns.map((col, i) => (
              <th
                key={i}
                className="border-b px-2 py-1.5 font-semibold"
                style={{
                  borderColor: 'var(--slide-border)',
                  color: 'var(--slide-accent)',
                  fontSize: 'var(--slide-caption-size)',
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, r) => (
            <tr key={r}>
              {data.columns.map((_, c) => (
                <td
                  key={c}
                  className="border-b px-2 py-1.5 align-top"
                  style={{
                    borderColor: 'var(--slide-border)',
                    fontSize: 'var(--slide-caption-size)',
                  }}
                >
                  {row[c] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TimelineView({ data }: { data: Extract<SlideData, { kind: 'timeline' }> }) {
  return (
    <ol className="flex h-full flex-col gap-3">
      {data.events.map((event, i) => (
        <li key={i} className="relative flex gap-3 pl-1">
          <div className="flex flex-col items-center">
            <span
              className="mt-1 h-2.5 w-2.5 rounded-full"
              style={{ background: 'var(--slide-accent)' }}
            />
            {i < data.events.length - 1 ? (
              <span className="mt-1 w-px flex-1" style={{ background: 'var(--slide-border)' }} />
            ) : null}
          </div>
          <div className="pb-1">
            <p
              className="font-semibold"
              style={{ color: 'var(--slide-accent)', fontSize: 'var(--slide-caption-size)' }}
            >
              {event.label}
            </p>
            <p style={{ fontFamily: 'var(--slide-font-body)', fontSize: 'var(--slide-body-size)' }}>
              {event.title}
            </p>
            {event.description ? (
              <p className="text-(--slide-muted)" style={{ fontSize: 'var(--slide-caption-size)' }}>
                {event.description}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  )
}

function MetricsView({ data }: { data: Extract<SlideData, { kind: 'metrics' }> }) {
  return (
    <div
      className={cn(
        'grid h-full content-center gap-3',
        data.items.length <= 2 ? 'grid-cols-2' : 'grid-cols-3',
      )}
    >
      {data.items.map((item, i) => (
        <div key={i} className="flex flex-col gap-0.5">
          <span
            className="font-bold leading-none"
            style={{
              color: 'var(--slide-accent)',
              fontFamily: 'var(--slide-font-display)',
              fontSize: 'calc(var(--slide-title-size) * 1.1)',
            }}
          >
            {item.value}
          </span>
          <span
            className="font-medium"
            style={{ fontFamily: 'var(--slide-font-body)', fontSize: 'var(--slide-body-size)' }}
          >
            {item.label}
          </span>
          {item.caption ? (
            <span className="text-(--slide-muted)" style={{ fontSize: 'var(--slide-caption-size)' }}>
              {item.caption}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  )
}
