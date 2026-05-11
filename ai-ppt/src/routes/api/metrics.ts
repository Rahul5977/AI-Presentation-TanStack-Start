import { createFileRoute } from '@tanstack/react-router'

import { prisma } from '@/lib/db'
import { QUEUE_NAMES } from '@/server/queue/queues'
import { getQueueDepthSnapshot } from '@/server/queue/rabbit'
import { logger } from '@/server/logging/logger'
import { captureWebException } from '@/server/observability/sentry'

function requireMetricsToken(request: Request) {
  const expected = process.env.METRICS_TOKEN
  if (!expected) return true

  const authHeader = request.headers.get('authorization')
  if (authHeader?.trim() === `Bearer ${expected}`) return true

  const url = new URL(request.url)
  return url.searchParams.get('token') === expected
}

export const Route = createFileRoute('/api/metrics')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!requireMetricsToken(request)) {
          return new Response('unauthorized\n', { status: 401 })
        }

        try {
          const queueDepth = await getQueueDepthSnapshot(Object.values(QUEUE_NAMES))

          const byType = await prisma.generationJob.groupBy({
            by: ['type', 'status'],
            _count: { _all: true },
          })

          const avgRows = await prisma.$queryRaw<
            Array<{ avg_seconds: number | null }>
          >`SELECT AVG(EXTRACT(EPOCH FROM ("completedAt" - "createdAt"))) AS avg_seconds
             FROM "generation_job"
            WHERE status = 'SUCCEEDED' AND "completedAt" IS NOT NULL`
          const avgSeconds = avgRows[0]?.avg_seconds ?? 0

          const lines = [
            '# HELP queue_depth_messages Number of ready messages in RabbitMQ queue',
            '# TYPE queue_depth_messages gauge',
            ...queueDepth.map(
              (item) => `queue_depth_messages{queue="${item.queue}"} ${item.ready}`,
            ),
            '# HELP queue_consumers Number of consumers attached to queue',
            '# TYPE queue_consumers gauge',
            ...queueDepth.map(
              (item) => `queue_consumers{queue="${item.queue}"} ${item.consumers}`,
            ),
            '# HELP generation_jobs_total Generation jobs grouped by type and status',
            '# TYPE generation_jobs_total gauge',
            ...byType.map(
              (row) =>
                `generation_jobs_total{type="${row.type}",status="${row.status}"} ${row._count._all}`,
            ),
            '# HELP generation_avg_seconds Average generation job duration in seconds',
            '# TYPE generation_avg_seconds gauge',
            `generation_avg_seconds ${avgSeconds}`,
          ]

          return new Response(`${lines.join('\n')}\n`, {
            headers: {
              'content-type': 'text/plain; version=0.0.4; charset=utf-8',
            },
          })
        } catch (error) {
          captureWebException(error, { endpoint: 'metrics' })
          logger.error(
            { err: error instanceof Error ? error.message : String(error) },
            'Failed to compute metrics',
          )
          return new Response('metrics_error\n', { status: 503 })
        }
      },
    },
  },
})
