import { createFileRoute } from '@tanstack/react-router'
import Redis from 'ioredis'

import { json } from '@tanstack/react-start'
import {
  WORKER_CLASSES,
  workerHeartbeatKey,
} from '@/server/workers/classes'

const HEARTBEAT_TTL_MS = Number.parseInt(
  process.env.WORKER_HEARTBEAT_TTL_MS ?? '30000',
  10,
)

function getRedisUrl() {
  return process.env.REDIS_URL ?? 'redis://localhost:6379'
}

export const Route = createFileRoute('/api/health/workers/')({
  server: {
    handlers: {
      GET: async () => {
        const redis = new Redis(getRedisUrl())
        try {
          const checks = await Promise.all(
            WORKER_CLASSES.map(async (workerClass) => {
              const raw = await redis.get(workerHeartbeatKey(workerClass))
              if (!raw) {
                return {
                  workerClass,
                  ok: false,
                  status: 'missing-heartbeat',
                  ageMs: null,
                }
              }

              const payload = JSON.parse(raw) as { at?: string; pid?: number }
              const at = payload.at ? new Date(payload.at).getTime() : 0
              const ageMs = at > 0 ? Date.now() - at : Number.POSITIVE_INFINITY
              const ok = ageMs <= HEARTBEAT_TTL_MS
              return {
                workerClass,
                ok,
                status: ok ? 'healthy' : 'stale-heartbeat',
                ageMs: Number.isFinite(ageMs) ? ageMs : null,
                pid: payload.pid ?? null,
              }
            }),
          )

          const allHealthy = checks.every((check) => check.ok)
          return json(
            {
              ok: allHealthy,
              checks,
            },
            { status: allHealthy ? 200 : 503 },
          )
        } catch (error) {
          return json(
            {
              ok: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 503 },
          )
        } finally {
          await redis.quit()
        }
      },
    },
  },
})
