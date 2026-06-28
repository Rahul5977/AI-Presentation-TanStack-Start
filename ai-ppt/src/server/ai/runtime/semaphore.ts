import { randomUUID } from 'node:crypto'

import { aiRedis } from './redis'
import { runtimeLog } from './log'

/**
 * Distributed concurrency limiter backed by a Redis sorted set of time-bounded
 * leases (score = expiry timestamp). Caps concurrent in-flight provider calls
 * across ALL worker/web processes, preventing 429 storms.
 *
 * Crash-safe: leases auto-expire, so a worker that dies mid-call never holds a
 * slot forever. Uses discrete commands (no Lua) — a small over-admission race
 * is acceptable for a soft concurrency cap. Fails OPEN on Redis errors.
 */

const SENTINEL_OPEN = '__sem_open__'

function key(name: string) {
  return `ai:sem:${name}`
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Try to acquire a slot within `waitMs`. Returns a lease token to pass to
 * `release`, or a sentinel token if Redis is unavailable (fail-open).
 */
export async function acquireSlot(
  name: string,
  limit: number,
  leaseMs: number,
  waitMs: number,
): Promise<string> {
  const k = key(name)
  const token = randomUUID()
  const deadline = Date.now() + waitMs

  for (;;) {
    try {
      const redis = aiRedis()
      const now = Date.now()
      // Drop expired leases, then count current holders.
      await redis.zremrangebyscore(k, 0, now)
      const count = await redis.zcard(k)
      if (count < limit) {
        await redis.zadd(k, now + leaseMs, token)
        await redis.pexpire(k, leaseMs + 60_000)
        return token
      }
    } catch (err) {
      runtimeLog.warn('semaphore acquire failed; proceeding without a slot', {
        name,
        err: err instanceof Error ? err.message : String(err),
      })
      return SENTINEL_OPEN
    }

    if (Date.now() >= deadline) {
      // Couldn't get a slot in time — proceed anyway rather than fail the user.
      runtimeLog.warn('semaphore wait timed out; proceeding without a slot', { name, limit })
      return SENTINEL_OPEN
    }
    await sleep(150)
  }
}

export async function releaseSlot(name: string, token: string): Promise<void> {
  if (token === SENTINEL_OPEN) return
  try {
    await aiRedis().zrem(key(name), token)
  } catch {
    // Lease will expire on its own.
  }
}
