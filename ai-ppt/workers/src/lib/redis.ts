import Redis from 'ioredis'

import { logger } from './logger'

let redisClient: Redis | null = null

export function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      // Exponential reconnect backoff, capped, so a Redis blip doesn't spin hot.
      retryStrategy: (times) => Math.min(times * 200, 5_000),
    })
    // Without an 'error' listener ioredis emits unhandled error events that can
    // crash the worker. Log and let the retry strategy recover.
    redisClient.on('error', (err) => {
      logger.warn(
        { err: err instanceof Error ? err.message : String(err) },
        'Redis client error (will retry)',
      )
    })
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

export async function publishDraftEvent(
  draftId: string,
  event: Record<string, unknown>,
) {
  try {
    const redis = getRedisClient()
    await redis.publish(
      `draft:${draftId}:events`,
      JSON.stringify({
        ts: new Date().toISOString(),
        ...event,
      }),
    )
  } catch (error) {
    logger.warn(
      {
        draftId,
        err: error instanceof Error ? error.message : String(error),
      },
      'Draft event publish failed; continuing without realtime event',
    )
  }
}
