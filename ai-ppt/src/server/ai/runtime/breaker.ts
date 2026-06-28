import { aiRedis } from './redis'
import { runtimeLog } from './log'

/**
 * Per-provider circuit breaker backed by Redis. After `threshold` consecutive
 * failures the breaker opens for `cooldownMs`, during which callers skip that
 * provider. Fails OPEN on Redis errors (never blocks a call because the breaker
 * store is unavailable).
 */

function failKey(key: string) {
  return `ai:cb:fail:${key}`
}
function openKey(key: string) {
  return `ai:cb:open:${key}`
}

export async function isBreakerOpen(key: string): Promise<boolean> {
  try {
    return (await aiRedis().exists(openKey(key))) > 0
  } catch (err) {
    runtimeLog.warn('breaker isOpen check failed; treating as closed', {
      key,
      err: err instanceof Error ? err.message : String(err),
    })
    return false
  }
}

export async function recordBreakerFailure(
  key: string,
  threshold: number,
  cooldownMs: number,
): Promise<void> {
  try {
    const redis = aiRedis()
    const count = await redis.incr(failKey(key))
    // Keep the failure window bounded so isolated failures decay.
    await redis.pexpire(failKey(key), cooldownMs * 2)
    if (count >= threshold) {
      await redis.set(openKey(key), '1', 'PX', cooldownMs)
      await redis.del(failKey(key))
      runtimeLog.warn('circuit breaker opened', { key, count, cooldownMs })
    }
  } catch (err) {
    runtimeLog.warn('breaker recordFailure failed', {
      key,
      err: err instanceof Error ? err.message : String(err),
    })
  }
}

export async function recordBreakerSuccess(key: string): Promise<void> {
  try {
    await aiRedis().del(failKey(key), openKey(key))
  } catch {
    // best-effort
  }
}
