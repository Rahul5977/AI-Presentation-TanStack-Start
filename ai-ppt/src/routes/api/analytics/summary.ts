import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

function monthWindow(offset = 0) {
  const now = new Date()
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1)),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset + 1, 1)),
  }
}

export const Route = createFileRoute('/api/analytics/summary')({
  server: {
    handlers: {
      GET: async () => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

        const current = monthWindow(0)
        const previous = monthWindow(-1)

        const [currentAgg, previousAgg] = await Promise.all([
          prisma.usageEvent.groupBy({
            by: ['metric'],
            where: {
              userId: session.user.id,
              createdAt: { gte: current.start, lt: current.end },
            },
            _sum: { quantity: true },
          }),
          prisma.usageEvent.groupBy({
            by: ['metric'],
            where: {
              userId: session.user.id,
              createdAt: { gte: previous.start, lt: previous.end },
            },
            _sum: { quantity: true },
          }),
        ])

        const toMap = (rows: typeof currentAgg) =>
          rows.reduce<Record<string, number>>((acc, row) => {
            acc[row.metric] = row._sum.quantity ?? 0
            return acc
          }, {})

        const currentMap = toMap(currentAgg)
        const previousMap = toMap(previousAgg)

        const decksCreated = currentMap.PRESENTATIONS_CREATED ?? 0
        const slidesGenerated = currentMap.SLIDES_GENERATED ?? 0
        const exportsCount = currentMap.EXPORTS ?? 0

        return json({
          period: {
            start: current.start.toISOString(),
            end: current.end.toISOString(),
          },
          summary: {
            decksCreated,
            slidesGenerated,
            exports: exportsCount,
          },
          trends: {
            decksCreated: decksCreated - (previousMap.PRESENTATIONS_CREATED ?? 0),
            slidesGenerated: slidesGenerated - (previousMap.SLIDES_GENERATED ?? 0),
            exports: exportsCount - (previousMap.EXPORTS ?? 0),
          },
        })
      },
    },
  },
})
