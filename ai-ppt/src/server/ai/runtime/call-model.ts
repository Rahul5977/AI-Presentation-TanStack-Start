import { aiConfig, callTimeoutMs, semaphoreLimit, type CallKind } from './config'
import { getCached, makeCacheKey, setCached } from './cache'
import { checkBudget, recordSpend } from './budget'
import { isBreakerOpen, recordBreakerFailure, recordBreakerSuccess } from './breaker'
import { acquireSlot, releaseSlot } from './semaphore'
import { withTimeout } from './timeout'
import { AllProvidersFailedError, BudgetExceededError, classifyError } from './errors'
import { estimateCostUsd, type TokenUsage } from './pricing'
import { runtimeLog } from './log'
import type { AiOp, ProviderAttempt } from './registry'

/** What a provider call returns: the parsed value plus token/image usage. */
export type ModelRunResult<T> = { value: T; usage: TokenUsage }

export type CallModelResult<T> = {
  value: T
  provider: string
  model: string
  usage: TokenUsage
  estCostUsd: number
  cached: boolean
}

export type CallModelOptions<T> = {
  op: AiOp
  kind: CallKind
  chain: ProviderAttempt[]
  /** Invokes the underlying provider SDK for a given {provider, model}. Must
   *  honor the AbortSignal where the SDK supports it. */
  run: (ctx: { provider: string; model: string; signal: AbortSignal }) => Promise<ModelRunResult<T>>
  userId?: string
  /** Input used to build the response-cache key. Omit to disable caching (e.g.
   *  for non-deterministic regenerations the user explicitly wants fresh). */
  cacheInput?: unknown
  /** Override the per-call timeout (defaults by kind). */
  timeoutMs?: number
}

/**
 * The AI orchestration entry point. Every model call should flow through here.
 * Provides, in order: response cache → budget precheck → per-provider circuit
 * breaker + concurrency semaphore → per-call timeout → token/cost accounting →
 * model fallback. Retryable failures advance down the chain; terminal failures
 * (bad input / unparseable output / budget) short-circuit so the queue layer
 * can dead-letter them instead of retrying.
 */
export async function callModel<T>(opts: CallModelOptions<T>): Promise<CallModelResult<T>> {
  const { op, kind, chain, run, userId } = opts
  const timeoutMs = opts.timeoutMs ?? callTimeoutMs(kind)

  const cacheKey =
    opts.cacheInput !== undefined && opts.cacheInput !== null
      ? makeCacheKey({ op, input: opts.cacheInput })
      : null

  if (cacheKey) {
    const hit = await getCached<CallModelResult<T>>(cacheKey)
    if (hit) {
      return { ...hit, cached: true }
    }
  }

  const budget = await checkBudget({
    userId,
    globalCapUsd: aiConfig.budget.globalDailyUsd(),
    userCapUsd: aiConfig.budget.userDailyUsd(),
  })
  if (!budget.ok) {
    throw new BudgetExceededError(budget.scope)
  }

  if (chain.length === 0) {
    throw new AllProvidersFailedError(op, new Error('empty provider chain'))
  }

  let lastRetryableError: unknown
  for (const attempt of chain) {
    const breakerKey = `${op}:${attempt.provider}`
    if (await isBreakerOpen(breakerKey)) {
      runtimeLog.warn('skipping provider; breaker open', { op, provider: attempt.provider })
      lastRetryableError = lastRetryableError ?? new Error(`circuit breaker open for ${attempt.provider}`)
      continue
    }

    const semName = `${attempt.provider}:${kind}`
    const token = await acquireSlot(
      semName,
      semaphoreLimit(kind),
      aiConfig.semaphore.leaseMs(),
      aiConfig.semaphore.waitMs(),
    )

    try {
      const result = await withTimeout(
        (signal) => run({ provider: attempt.provider, model: attempt.model, signal }),
        timeoutMs,
        `${op}:${attempt.provider}:${attempt.model}`,
      )
      await recordBreakerSuccess(breakerKey)
      const estCostUsd = estimateCostUsd(attempt.model, result.usage)
      await recordSpend({ userId, costUsd: estCostUsd })
      const out: CallModelResult<T> = {
        value: result.value,
        provider: attempt.provider,
        model: attempt.model,
        usage: result.usage,
        estCostUsd,
        cached: false,
      }
      if (cacheKey) await setCached(cacheKey, out, aiConfig.cache.ttlMs())
      return out
    } catch (err) {
      if (err instanceof BudgetExceededError) throw err
      const cls = classifyError(err)
      if (cls === 'terminal') {
        // Bad input / unparseable output: retrying won't help. Propagate so the
        // queue layer dead-letters immediately.
        runtimeLog.warn('provider call failed (terminal)', {
          op,
          provider: attempt.provider,
          err: err instanceof Error ? err.message : String(err),
        })
        throw err
      }
      // Retryable: count against the breaker and fall through to the next provider.
      lastRetryableError = err
      await recordBreakerFailure(breakerKey, aiConfig.breaker.threshold(), aiConfig.breaker.cooldownMs())
      runtimeLog.warn('provider call failed (retryable); trying next provider', {
        op,
        provider: attempt.provider,
        err: err instanceof Error ? err.message : String(err),
      })
    } finally {
      await releaseSlot(semName, token)
    }
  }

  throw new AllProvidersFailedError(op, lastRetryableError)
}
