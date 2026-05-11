import { createFileRoute } from '@tanstack/react-router'
import Redis from 'ioredis'

import { json } from '@tanstack/react-start'
import {
  isWorkerClass,
  workerHeartbeatKey,
} from '@/server/workers/classes'

function getRedisUrl() {
  return process.env.REDIS_URL ?? 'redis://localhost:6379'
}

const HEARTBEAT_TTL_MS = Number.parseInt(
  process.env.WORKER_HEARTBEAT_TTL_MS ?? '30000',
  10,
)

export const Route = createFileRoute('/api/health/workers/$workerClass')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!isWorkerClass(params.workerClass)) {
          return json(
            { ok: false, error: 'Invalid worker class.' },
            { status: 400 },
          )
        }

        const redis = new Redis(getRedisUrl())
        try {
          const raw = await redis.get(workerHeartbeatKey(params.workerClass))
          if (!raw) {
            return json(
              {
                ok: false,
                workerClass: params.workerClass,
                status: 'missing-heartbeat',
              },
              { status: 503 },
            )
          }

          const payload = JSON.parse(raw) as { at?: string; pid?: number }
          const at = payload.at ? new Date(payload.at).getTime() : 0
          const ageMs = at > 0 ? Date.now() - at : Number.POSITIVE_INFINITY
          const ok = ageMs <= HEARTBEAT_TTL_MS

          return json(
            {
              ok,
              workerClass: params.workerClass,
              status: ok ? 'healthy' : 'stale-heartbeat',
              ageMs: Number.isFinite(ageMs) ? ageMs : null,
              pid: payload.pid ?? null,
              heartbeatAt: payload.at ?? null,
            },
            { status: ok ? 200 : 503 },
          )
        } catch (error) {
          return json(
            {
              ok: false,
              workerClass: params.workerClass,
              status: 'error',
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
