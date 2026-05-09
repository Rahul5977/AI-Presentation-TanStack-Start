import { createFileRoute } from '@tanstack/react-router'
import Redis from 'ioredis'

import { json } from '@tanstack/react-start'

import { prisma } from '@/lib/db'
import { getRabbitChannel } from '@/server/queue/rabbit'

export const Route = createFileRoute('/api/health/system')({
  server: {
    handlers: {
      GET: async () => {
        const report = {
          ok: true,
          services: {
            db: false,
            rabbitmq: false,
            redis: false,
          },
        }

        try {
          await prisma.$queryRaw`SELECT 1`
          report.services.db = true
        } catch {
          report.ok = false
        }

        try {
          await getRabbitChannel()
          report.services.rabbitmq = true
        } catch {
          report.ok = false
        }

        const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379')
        try {
          await redis.ping()
          report.services.redis = true
        } catch {
          report.ok = false
        } finally {
          await redis.quit()
        }

        return json(report, { status: report.ok ? 200 : 503 })
      },
    },
  },
})
