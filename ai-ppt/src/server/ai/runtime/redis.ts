import Redis from 'ioredis'

/**
 * Minimal Redis surface used by the ai-runtime primitives. The real ioredis
 * client satisfies this structurally; tests inject a small in-memory fake via
 * `__setAiRedisForTesting`.
 */
export interface RedisLike {
  incr(key: string): Promise<number>
  incrbyfloat(key: string, increment: number | string): Promise<string>
  get(key: string): Promise<string | null>
  set(key: string, value: string, ...args: Array<string | number>): Promise<unknown>
  del(...keys: string[]): Promise<number>
  exists(...keys: string[]): Promise<number>
  expire(key: string, seconds: number): Promise<number>
  pexpire(key: string, ms: number): Promise<number>
  pttl(key: string): Promise<number>
  zadd(key: string, score: number, member: string): Promise<unknown>
  zrem(key: string, ...members: string[]): Promise<number>
  zcard(key: string): Promise<number>
  zremrangebyscore(key: string, min: number | string, max: number | string): Promise<number>
}

let client: RedisLike | null = null

/**
 * Shared, lazily-connected ioredis client for ai-runtime. Self-contained (its
 * own connection) so it works identically in the web app and the worker
 * process without depending on either's existing client.
 */
export function aiRedis(): RedisLike {
  if (!client) {
    const instance = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      // Don't let a transient Redis blip throw synchronously on command issue;
      // primitives handle errors and fail open/closed per their policy.
      enableOfflineQueue: true,
      retryStrategy: (times) => Math.min(times * 200, 5_000),
    })
    // Prevent unhandled 'error' events from crashing the process; primitives
    // already fail open/closed on command errors.
    instance.on('error', () => {})
    client = instance as unknown as RedisLike
  }
  return client
}

/** Test seam: inject a fake Redis. Returns a restore function. */
export function __setAiRedisForTesting(fake: RedisLike | null): () => void {
  const previous = client
  client = fake
  return () => {
    client = previous
  }
}
