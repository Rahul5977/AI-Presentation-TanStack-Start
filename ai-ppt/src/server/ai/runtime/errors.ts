/** Error types + classification for the AI orchestration runtime. */

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}

export type BudgetScope = 'global' | 'user'

export class BudgetExceededError extends Error {
  constructor(public readonly scope: BudgetScope) {
    super(
      scope === 'global'
        ? 'The service has reached its daily generation budget. Please try again later.'
        : 'You have reached your daily generation limit. Please try again tomorrow or upgrade.',
    )
    this.name = 'BudgetExceededError'
  }
}

export class AllProvidersFailedError extends Error {
  constructor(
    public readonly op: string,
    public readonly lastError: unknown,
  ) {
    const detail = lastError instanceof Error ? lastError.message : String(lastError)
    super(`All providers failed for "${op}": ${detail}`)
    this.name = 'AllProvidersFailedError'
  }
}

/** A model returned output we could not parse/validate. Terminal (retrying the
 *  same provider/input won't help), but a different provider may still succeed. */
export class ModelOutputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ModelOutputError'
  }
}

export type ErrorClass = 'retryable' | 'terminal'

function statusOf(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null) return undefined
  const e = err as Record<string, unknown>
  for (const key of ['status', 'statusCode', 'code']) {
    const v = e[key]
    if (typeof v === 'number') return v
    if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v)
  }
  // Nested response.status (OpenAI/axios-style)
  const response = e.response as Record<string, unknown> | undefined
  if (response && typeof response.status === 'number') return response.status
  return undefined
}

/**
 * Classify an error as `retryable` (transient: rate limit, server error,
 * network, timeout) or `terminal` (the request itself is bad: 4xx validation,
 * unparseable output). Terminal errors should not retry the same provider/input.
 */
export function classifyError(err: unknown): ErrorClass {
  // Unwrap a fallback-chain failure to classify the underlying cause, so the
  // queue layer retries/dead-letters based on what actually went wrong.
  if (err instanceof AllProvidersFailedError) return classifyError(err.lastError)
  // Budget exhaustion won't clear by retrying now — let it dead-letter.
  if (err instanceof BudgetExceededError) return 'terminal'
  if (err instanceof TimeoutError) return 'retryable'
  // Our own validation / output-parse failures are terminal for that input.
  if (err instanceof ModelOutputError) return 'terminal'
  if (err instanceof SyntaxError) return 'terminal'
  // Zod-style validation errors expose an `issues` array.
  if (typeof err === 'object' && err !== null && Array.isArray((err as { issues?: unknown }).issues)) {
    return 'terminal'
  }

  const status = statusOf(err)
  if (status !== undefined) {
    if (status === 408 || status === 409 || status === 425 || status === 429) return 'retryable'
    if (status >= 500) return 'retryable'
    if (status >= 400) return 'terminal'
  }

  const message = (err instanceof Error ? err.message : String(err)).toLowerCase()
  if (
    /\b(429|rate.?limit|quota|resource.?exhausted|overloaded|temporarily unavailable|service unavailable|503|502|504|timeout|timed out|etimedout|econnreset|econnrefused|enotfound|eai_again|socket hang up|fetch failed|network)\b/.test(
      message,
    )
  ) {
    return 'retryable'
  }

  // Unknown errors: treat as retryable so a transient blip gets another shot;
  // the breaker + maxAttempts bound how much this can cost.
  return 'retryable'
}
