import Redis from 'ioredis'

import {
  workerHeartbeatKey,
  type WorkerClass,
} from '../../../src/server/workers/classes'
import { logger } from './logger'

const HEARTBEAT_INTERVAL_MS = Number.parseInt(
  process.env.WORKER_HEARTBEAT_INTERVAL_MS ?? '10000',
  10,
)
const HEARTBEAT_TTL_MS = Number.parseInt(
  process.env.WORKER_HEARTBEAT_TTL_MS ?? '30000',
  10,
)

function getRedisUrl() {
  return process.env.REDIS_URL ?? 'redis://localhost:6379'
}

type HeartbeatHandle = {
  stop: () => Promise<void>
}

export async function startWorkerHeartbeat(
  workerClass: WorkerClass,
): Promise<HeartbeatHandle> {
  const redis = new Redis(getRedisUrl(), {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  })
  await redis.connect()

  const key = workerHeartbeatKey(workerClass)

  const publish = async () => {
    const payload = JSON.stringify({
      class: workerClass,
      pid: process.pid,
      at: new Date().toISOString(),
    })
    await redis.set(key, payload, 'PX', HEARTBEAT_TTL_MS)
  }

  try {
    await publish()
  } catch (error) {
    logger.warn(
      {
        workerClass,
        err: error instanceof Error ? error.message : String(error),
      },
      'Failed to publish initial worker heartbeat',
    )
  }

  const timer = setInterval(() => {
    void publish().catch((error) => {
      logger.warn(
        {
          workerClass,
          err: error instanceof Error ? error.message : String(error),
        },
        'Failed to publish worker heartbeat',
      )
    })
  }, HEARTBEAT_INTERVAL_MS)

  return {
    stop: async () => {
      clearInterval(timer)
      try {
        await redis.del(key)
      } finally {
        await redis.quit()
      }
    },
  }
}
