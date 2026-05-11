import * as Sentry from '@sentry/node'

let initialized = false

export function initWorkerSentry() {
  if (initialized) return
  const dsn = process.env.SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? 'development',
    release: process.env.SENTRY_RELEASE,
  })

  initialized = true
}

export function captureWorkerException(
  error: unknown,
  context?: Record<string, unknown>,
) {
  if (!initialized) return
  const err =
    error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown worker error')
  Sentry.captureException(err, {
    extra: context,
    tags: { service: 'ppt-worker' },
  })
}
