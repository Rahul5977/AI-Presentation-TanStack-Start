import { aiRedis } from './redis'
import { runtimeLog } from './log'
import type { BudgetScope } from './errors'

/**
 * Daily AI spend tracking + caps, backed by atomic Redis counters. Enforces a
 * hard global daily cap (kill-switch) and a per-user daily cap. Caps are checked
 * BEFORE a call; the call's own cost is recorded after — so the cap may be
 * overshot by at most one in-flight call before subsequent calls are blocked,
 * which is acceptable for a soft daily ceiling.
 *
 * Fails OPEN on Redis errors (logs loudly) so a Redis outage doesn't halt all
 * generation; the provider-side billing alerts are the ultimate backstop.
 */

function utcDay(now = new Date()): string {
  return `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(
    now.getUTCDate(),
  ).padStart(2, '0')}`
}

function globalKey(day: string) {
  return `ai:budget:global:${day}`
}
function userKey(userId: string, day: string) {
  return `ai:budget:user:${userId}:${day}`
}

const TWO_DAYS_SECONDS = 2 * 24 * 60 * 60

async function readFloat(key: string): Promise<number> {
  const raw = await aiRedis().get(key)
  if (raw === null) return 0
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

export type BudgetCheck = { ok: true } | { ok: false; scope: BudgetScope; spentUsd: number; capUsd: number }

export async function checkBudget(params: {
  userId?: string
  globalCapUsd: number
  userCapUsd: number
}): Promise<BudgetCheck> {
  const day = utcDay()
  try {
    const globalSpent = await readFloat(globalKey(day))
    if (params.globalCapUsd > 0 && globalSpent >= params.globalCapUsd) {
      return { ok: false, scope: 'global', spentUsd: globalSpent, capUsd: params.globalCapUsd }
    }
    if (params.userId && params.userCapUsd > 0) {
      const userSpent = await readFloat(userKey(params.userId, day))
      if (userSpent >= params.userCapUsd) {
        return { ok: false, scope: 'user', spentUsd: userSpent, capUsd: params.userCapUsd }
      }
    }
    return { ok: true }
  } catch (err) {
    runtimeLog.warn('budget check failed; allowing (fail-open)', {
      err: err instanceof Error ? err.message : String(err),
    })
    return { ok: true }
  }
}

export async function recordSpend(params: { userId?: string; costUsd: number }): Promise<void> {
  if (!(params.costUsd > 0)) return
  const day = utcDay()
  try {
    const redis = aiRedis()
    const gKey = globalKey(day)
    await redis.incrbyfloat(gKey, params.costUsd)
    await redis.expire(gKey, TWO_DAYS_SECONDS)
    if (params.userId) {
      const uKey = userKey(params.userId, day)
      await redis.incrbyfloat(uKey, params.costUsd)
      await redis.expire(uKey, TWO_DAYS_SECONDS)
    }
  } catch (err) {
    runtimeLog.warn('budget recordSpend failed', {
      err: err instanceof Error ? err.message : String(err),
    })
  }
}

/** Read current daily spend (for metrics / health). */
export async function getDailySpend(userId?: string): Promise<{ globalUsd: number; userUsd?: number }> {
  const day = utcDay()
  try {
    const globalUsd = await readFloat(globalKey(day))
    if (!userId) return { globalUsd }
    const userUsd = await readFloat(userKey(userId, day))
    return { globalUsd, userUsd }
  } catch {
    return { globalUsd: 0 }
  }
}
