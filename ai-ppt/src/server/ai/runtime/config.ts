/** Env-driven configuration for the AI orchestration runtime. All values are
 *  overridable via environment variables and read at call time. */

function num(envName: string, fallback: number): number {
  const raw = process.env[envName]
  if (raw === undefined || raw.trim() === '') return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

export type CallKind = 'text' | 'image'

export const aiConfig = {
  /** Per-call timeout for text generation (outline/content/visualize/etc.). */
  textTimeoutMs: () => num('AI_CALL_TIMEOUT_MS', 60_000),
  /** Per-call timeout for image generation (slower). */
  imageTimeoutMs: () => num('AI_IMAGE_TIMEOUT_MS', 120_000),

  breaker: {
    /** Consecutive provider failures before the breaker opens. */
    threshold: () => num('AI_BREAKER_THRESHOLD', 5),
    /** How long the breaker stays open (skips the provider) once tripped. */
    cooldownMs: () => num('AI_BREAKER_COOLDOWN_MS', 30_000),
  },

  semaphore: {
    /** Max concurrent in-flight calls per provider for text ops. */
    textLimit: () => num('AI_SEM_TEXT', 8),
    /** Max concurrent in-flight calls per provider for image ops. */
    imageLimit: () => num('AI_SEM_IMAGE', 3),
    /** How long an acquired slot is leased before auto-expiry (crash safety). */
    leaseMs: () => num('AI_SEM_LEASE_MS', 180_000),
    /** Max time to wait to acquire a slot before proceeding without one. */
    waitMs: () => num('AI_SEM_WAIT_MS', 20_000),
  },

  cache: {
    ttlMs: () => num('AI_CACHE_TTL_MS', 86_400_000), // 24h
  },

  budget: {
    /** Hard global daily spend cap (USD). When exceeded, new generations are
     *  rejected at the enqueue gate and inside callModel. */
    globalDailyUsd: () => num('GLOBAL_DAILY_USD_CAP', 50),
    /** Per-user daily spend cap (USD). */
    userDailyUsd: () => num('USER_DAILY_USD_CAP', 5),
  },
}

export function semaphoreLimit(kind: CallKind): number {
  return kind === 'image' ? aiConfig.semaphore.imageLimit() : aiConfig.semaphore.textLimit()
}

export function callTimeoutMs(kind: CallKind): number {
  return kind === 'image' ? aiConfig.imageTimeoutMs() : aiConfig.textTimeoutMs()
}
