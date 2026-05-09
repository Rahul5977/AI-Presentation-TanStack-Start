import Redis from 'ioredis'

import { logger } from './logger'

let redisClient: Redis | null = null

export function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379')
  }
  return redisClient
}

export async function publishProgressEvent(
  presentationId: string,
  event: Record<string, unknown>,
) {
  try {
    const redis = getRedisClient()
    await redis.publish(
      `presentation:${presentationId}:events`,
      JSON.stringify({
        ts: new Date().toISOString(),
        ...event,
      }),
    )
  } catch (error) {
    logger.warn(
      {
        presentationId,
        err: error instanceof Error ? error.message : String(error),
      },
      'Progress event publish failed; continuing without realtime event',
    )
  }
}
