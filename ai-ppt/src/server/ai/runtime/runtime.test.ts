import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { __setAiRedisForTesting, type RedisLike } from './redis'
import {
  AllProvidersFailedError,
  BudgetExceededError,
  ModelOutputError,
  TimeoutError,
  classifyError,
} from './errors'
import { estimateCostUsd } from './pricing'
import { getFallbackChain } from './registry'
import { isBreakerOpen, recordBreakerFailure, recordBreakerSuccess } from './breaker'
import { acquireSlot, releaseSlot } from './semaphore'
import { checkBudget, recordSpend } from './budget'
import { getCached, makeCacheKey, setCached } from './cache'
import { callModel } from './call-model'

// ---- in-memory Redis fake ------------------------------------------------

class FakeRedis implements RedisLike {
  strings = new Map<string, string>()
  zsets = new Map<string, Map<string, number>>()
  expiry = new Map<string, number>()

  private alive(key: string): boolean {
    const e = this.expiry.get(key)
    if (e !== undefined && Date.now() > e) {
      this.strings.delete(key)
      this.zsets.delete(key)
      this.expiry.delete(key)
      return false
    }
    return true
  }
  async incr(key: string) {
    this.alive(key)
    const n = Number(this.strings.get(key) ?? '0') + 1
    this.strings.set(key, String(n))
    return n
  }
  async incrbyfloat(key: string, inc: number | string) {
    this.alive(key)
    const n = Number(this.strings.get(key) ?? '0') + Number(inc)
    this.strings.set(key, String(n))
    return String(n)
  }
  async get(key: string) {
    if (!this.alive(key)) return null
    return this.strings.get(key) ?? null
  }
  async set(key: string, value: string, ...args: Array<string | number>) {
    this.strings.set(key, value)
    for (let i = 0; i < args.length; i++) {
      if (String(args[i]).toUpperCase() === 'PX') this.expiry.set(key, Date.now() + Number(args[i + 1]))
    }
    return 'OK'
  }
  async del(...keys: string[]) {
    let c = 0
    for (const k of keys) {
      if (this.strings.delete(k) || this.zsets.delete(k)) c++
      this.expiry.delete(k)
    }
    return c
  }
  async exists(...keys: string[]) {
    let c = 0
    for (const k of keys) if (this.alive(k) && (this.strings.has(k) || this.zsets.has(k))) c++
    return c
  }
  async expire(key: string, sec: number) {
    if (this.strings.has(key) || this.zsets.has(key)) {
      this.expiry.set(key, Date.now() + sec * 1000)
      return 1
    }
    return 0
  }
  async pexpire(key: string, ms: number) {
    if (this.strings.has(key) || this.zsets.has(key)) {
      this.expiry.set(key, Date.now() + ms)
      return 1
    }
    return 0
  }
  async pttl(key: string) {
    const e = this.expiry.get(key)
    if (e === undefined) return -1
    return Math.max(0, e - Date.now())
  }
  private zset(key: string) {
    let z = this.zsets.get(key)
    if (!z) {
      z = new Map()
      this.zsets.set(key, z)
    }
    return z
  }
  async zadd(key: string, score: number, member: string) {
    this.alive(key)
    this.zset(key).set(member, score)
    return 1
  }
  async zrem(key: string, ...members: string[]) {
    const z = this.zsets.get(key)
    if (!z) return 0
    let c = 0
    for (const m of members) if (z.delete(m)) c++
    return c
  }
  async zcard(key: string) {
    if (!this.alive(key)) return 0
    return this.zsets.get(key)?.size ?? 0
  }
  async zremrangebyscore(key: string, min: number | string, max: number | string) {
    const z = this.zsets.get(key)
    if (!z) return 0
    const lo = min === '-inf' ? -Infinity : Number(min)
    const hi = max === '+inf' ? Infinity : Number(max)
    let c = 0
    for (const [m, s] of [...z]) {
      if (s >= lo && s <= hi) {
        z.delete(m)
        c++
      }
    }
    return c
  }
}

let restore: () => void
const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  restore = __setAiRedisForTesting(new FakeRedis())
})
afterEach(() => {
  restore()
  process.env = { ...ORIGINAL_ENV }
})

// ---- classifyError -------------------------------------------------------

describe('classifyError', () => {
  it('marks transient failures retryable', () => {
    expect(classifyError(new TimeoutError('x'))).toBe('retryable')
    expect(classifyError({ status: 429 })).toBe('retryable')
    expect(classifyError({ status: 503 })).toBe('retryable')
    expect(classifyError(new Error('RESOURCE_EXHAUSTED: quota'))).toBe('retryable')
    expect(classifyError(new Error('fetch failed (ECONNRESET)'))).toBe('retryable')
  })
  it('marks bad-input / output failures terminal', () => {
    expect(classifyError({ status: 400 })).toBe('terminal')
    expect(classifyError({ status: 422 })).toBe('terminal')
    expect(classifyError(new ModelOutputError('unparseable'))).toBe('terminal')
    expect(classifyError(new SyntaxError('bad json'))).toBe('terminal')
    expect(classifyError(new BudgetExceededError('global'))).toBe('terminal')
  })
  it('unwraps AllProvidersFailedError to its cause', () => {
    expect(classifyError(new AllProvidersFailedError('content', { status: 429 }))).toBe('retryable')
    expect(classifyError(new AllProvidersFailedError('content', { status: 400 }))).toBe('terminal')
  })
})

// ---- pricing -------------------------------------------------------------

describe('estimateCostUsd', () => {
  it('prices text tokens', () => {
    const cost = estimateCostUsd('gpt-4.1-mini', { inputTokens: 1_000_000, outputTokens: 1_000_000 })
    expect(cost).toBeCloseTo(0.4 + 1.6, 6)
  })
  it('prices images', () => {
    expect(estimateCostUsd('gpt-image-1', { images: 3 })).toBeCloseTo(0.06, 6)
  })
  it('returns 0 for unknown models', () => {
    expect(estimateCostUsd('mystery-model', { inputTokens: 1000 })).toBe(0)
  })
})

// ---- registry / fallback chain ------------------------------------------

describe('getFallbackChain', () => {
  it('puts the configured primary first with a fallback second', () => {
    process.env.CONTENT_PROVIDER = 'gemini'
    delete process.env.AI_FALLBACK_ENABLED
    const chain = getFallbackChain('content')
    expect(chain).toHaveLength(2)
    expect(chain[0].provider).toBe('gemini')
    expect(chain[1].provider).toBe('openai')
  })
  it('honors AI_FALLBACK_ENABLED=false (single attempt)', () => {
    process.env.AI_FALLBACK_ENABLED = 'false'
    expect(getFallbackChain('outline')).toHaveLength(1)
  })
  it('image op resolves image providers', () => {
    process.env.IMAGE_PROVIDER = 'openai'
    delete process.env.AI_FALLBACK_ENABLED
    const chain = getFallbackChain('image')
    expect(chain[0].provider).toBe('openai')
    expect(chain[1].provider).toBe('imagen')
  })
})

// ---- breaker -------------------------------------------------------------

describe('circuit breaker', () => {
  it('opens after threshold consecutive failures and resets on success', async () => {
    const key = 'content:gemini'
    expect(await isBreakerOpen(key)).toBe(false)
    await recordBreakerFailure(key, 3, 10_000)
    await recordBreakerFailure(key, 3, 10_000)
    expect(await isBreakerOpen(key)).toBe(false)
    await recordBreakerFailure(key, 3, 10_000)
    expect(await isBreakerOpen(key)).toBe(true)
    await recordBreakerSuccess(key)
    expect(await isBreakerOpen(key)).toBe(false)
  })
})

// ---- semaphore -----------------------------------------------------------

describe('semaphore', () => {
  it('tracks concurrent holders and releases', async () => {
    const t1 = await acquireSlot('openai:text', 2, 60_000, 1_000)
    const t2 = await acquireSlot('openai:text', 2, 60_000, 1_000)
    expect(t1).not.toEqual(t2)
    await releaseSlot('openai:text', t1)
    const t3 = await acquireSlot('openai:text', 2, 60_000, 1_000)
    expect(typeof t3).toBe('string')
    await releaseSlot('openai:text', t2)
    await releaseSlot('openai:text', t3)
  })
})

// ---- budget --------------------------------------------------------------

describe('budget', () => {
  it('allows under cap and blocks over global/user cap', async () => {
    expect((await checkBudget({ userId: 'u1', globalCapUsd: 10, userCapUsd: 2 })).ok).toBe(true)
    await recordSpend({ userId: 'u1', costUsd: 3 })
    const userBlocked = await checkBudget({ userId: 'u1', globalCapUsd: 10, userCapUsd: 2 })
    expect(userBlocked.ok).toBe(false)
    if (!userBlocked.ok) expect(userBlocked.scope).toBe('user')
    await recordSpend({ userId: 'u2', costUsd: 20 })
    const globalBlocked = await checkBudget({ userId: 'u3', globalCapUsd: 10, userCapUsd: 100 })
    expect(globalBlocked.ok).toBe(false)
    if (!globalBlocked.ok) expect(globalBlocked.scope).toBe('global')
  })
})

// ---- cache ---------------------------------------------------------------

describe('cache', () => {
  it('round-trips values and misses on unknown key', async () => {
    const key = makeCacheKey({ op: 'outline', input: { a: 1 } })
    expect(await getCached(key)).toBeNull()
    await setCached(key, { value: 42 }, 60_000)
    expect(await getCached<{ value: number }>(key)).toEqual({ value: 42 })
  })
})

// ---- callModel orchestration --------------------------------------------

describe('callModel', () => {
  const baseUsage = { inputTokens: 100, outputTokens: 50 }

  it('returns the first provider result on success and records spend', async () => {
    const run = vi.fn(async ({ model }: { model: string }) => ({ value: `ok:${model}`, usage: baseUsage }))
    const res = await callModel({
      op: 'content',
      kind: 'text',
      chain: [{ provider: 'gemini', model: 'gemini-2.5-pro' }],
      run,
    })
    expect(res.value).toBe('ok:gemini-2.5-pro')
    expect(res.provider).toBe('gemini')
    expect(res.estCostUsd).toBeGreaterThan(0)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('falls through to the next provider on a retryable error', async () => {
    const run = vi
      .fn()
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValueOnce({ value: 'second', usage: baseUsage })
    const res = await callModel({
      op: 'content',
      kind: 'text',
      chain: [
        { provider: 'gemini', model: 'gemini-2.5-pro' },
        { provider: 'openai', model: 'gpt-4.1-mini' },
      ],
      run,
    })
    expect(res.value).toBe('second')
    expect(res.provider).toBe('openai')
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('short-circuits on a terminal error without trying the next provider', async () => {
    const run = vi.fn().mockRejectedValue({ status: 400, message: 'bad request' })
    await expect(
      callModel({
        op: 'content',
        kind: 'text',
        chain: [
          { provider: 'gemini', model: 'gemini-2.5-pro' },
          { provider: 'openai', model: 'gpt-4.1-mini' },
        ],
        run,
      }),
    ).rejects.toMatchObject({ status: 400 })
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('skips a provider whose breaker is open', async () => {
    await recordBreakerFailure('content:gemini', 1, 10_000) // opens immediately (threshold 1)
    const run = vi.fn(async ({ provider }: { provider: string }) => ({ value: provider, usage: baseUsage }))
    const res = await callModel({
      op: 'content',
      kind: 'text',
      chain: [
        { provider: 'gemini', model: 'gemini-2.5-pro' },
        { provider: 'openai', model: 'gpt-4.1-mini' },
      ],
      run,
    })
    expect(res.provider).toBe('openai')
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('throws BudgetExceededError before running when over cap', async () => {
    process.env.GLOBAL_DAILY_USD_CAP = '1'
    await recordSpend({ costUsd: 5 })
    const run = vi.fn()
    await expect(
      callModel({
        op: 'content',
        kind: 'text',
        chain: [{ provider: 'gemini', model: 'gemini-2.5-pro' }],
        run,
      }),
    ).rejects.toBeInstanceOf(BudgetExceededError)
    expect(run).not.toHaveBeenCalled()
  })

  it('returns a cached result without running again', async () => {
    const run = vi.fn(async () => ({ value: 'fresh', usage: baseUsage }))
    const opts = {
      op: 'outline' as const,
      kind: 'text' as const,
      chain: [{ provider: 'openai', model: 'gpt-4.1-mini' }],
      run,
      cacheInput: { prompt: 'hello' },
    }
    const first = await callModel(opts)
    expect(first.cached).toBe(false)
    const second = await callModel(opts)
    expect(second.cached).toBe(true)
    expect(second.value).toBe('fresh')
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('wraps exhausted retryable failures in AllProvidersFailedError', async () => {
    const run = vi.fn().mockRejectedValue({ status: 503 })
    await expect(
      callModel({
        op: 'content',
        kind: 'text',
        chain: [
          { provider: 'gemini', model: 'gemini-2.5-pro' },
          { provider: 'openai', model: 'gpt-4.1-mini' },
        ],
        run,
      }),
    ).rejects.toBeInstanceOf(AllProvidersFailedError)
    expect(run).toHaveBeenCalledTimes(2)
  })
})
