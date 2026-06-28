import Redis from 'ioredis'

import { logger } from '@/server/logging/logger'

const DEFAULT_WINDOW_MS = 60_000
const DEFAULT_MAX = 30

let redisClient: Redis | null = null

function redis() {
  if (redisClient) return redisClient
  redisClient = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  })
  return redisClient
}

export class RateLimitError extends Error {
  constructor(
    public readonly remainingMs: number,
    public readonly maxRequests: number,
  ) {
    super('Rate limit exceeded.')
    this.name = 'RateLimitError'
  }
}

export async function assertRateLimit(params: {
  userId: string
  bucket: string
  max?: number
  windowMs?: number
}) {
  const envMax = Number.parseInt(process.env.RATE_LIMIT_MAX ?? '', 10)
  const envWindow = Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '', 10)
  const max = params.max ?? (Number.isFinite(envMax) ? envMax : DEFAULT_MAX)
  const windowMs =
    params.windowMs ?? (Number.isFinite(envWindow) ? envWindow : DEFAULT_WINDOW_MS)

  const key = `ratelimit:${params.bucket}:${params.userId}`
  const client = redis()

  let count: number
  try {
    await client.connect().catch(() => undefined)
    count = await client.incr(key)
    if (count === 1) {
      await client.pexpire(key, windowMs)
    }
  } catch (error) {
    // Fail open: if the rate-limit backend (Redis) is unreachable, never block a
    // legitimate request behind an infra outage. Log so it's visible in ops.
    logger.warn(
      {
        bucket: params.bucket,
        err: error instanceof Error ? error.message : String(error),
      },
      'Rate limit check skipped (Redis unavailable)',
    )
    return
  }

  if (count > max) {
    const ttl = await client.pttl(key).catch(() => windowMs)
    throw new RateLimitError(ttl > 0 ? ttl : windowMs, max)
  }
}

export function rateLimitErrorMessage(error: unknown) {
  if (error instanceof RateLimitError) {
    return `Rate limit reached. Try again in ${Math.ceil(error.remainingMs / 1000)}s.`
  }
  return error instanceof Error ? error.message : 'Rate limit check failed.'
}
