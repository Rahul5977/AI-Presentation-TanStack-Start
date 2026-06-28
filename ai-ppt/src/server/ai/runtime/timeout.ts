import { TimeoutError } from './errors'

/**
 * Run `fn` with a hard timeout. The provided AbortSignal is passed to `fn` so a
 * cooperating SDK call can cancel, AND we race a rejection so the timeout fires
 * even if the SDK ignores the signal. Throws TimeoutError on expiry.
 */
export async function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort()
      reject(new TimeoutError(`${label} timed out after ${ms}ms`))
    }, ms)
  })

  try {
    return await Promise.race([fn(controller.signal), timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
