export const QUEUE_NAMES = {
  outlineGenerate: 'outline.generate',
  slideContentGenerate: 'slide.content.generate',
  slideImageGenerate: 'slide.image.generate',
  slideImageUpload: 'slide.image.upload',
  presentationFinalize: 'presentation.finalize',
} as const

export const DLX_NAME = 'presentation.jobs.dlx'

export function queueDlqName(queueName: string) {
  return `${queueName}.dlq`
}

export function queueRetryName(queueName: string) {
  return `${queueName}.retry`
}

/**
 * Per-queue consumer prefetch (max unacked messages in flight per consumer).
 * Cheap/fast text work runs higher; slow/expensive image work runs lower so a
 * burst doesn't overwhelm provider rate limits or worker memory. Env-tunable.
 */
export function queuePrefetch(queueName: string): number {
  const config: Record<string, { env: string; def: number }> = {
    [QUEUE_NAMES.outlineGenerate]: { env: 'AI_PREFETCH_OUTLINE', def: 3 },
    [QUEUE_NAMES.slideContentGenerate]: { env: 'AI_PREFETCH_CONTENT', def: 5 },
    [QUEUE_NAMES.slideImageGenerate]: { env: 'AI_PREFETCH_IMAGE', def: 2 },
    [QUEUE_NAMES.slideImageUpload]: { env: 'AI_PREFETCH_UPLOAD', def: 5 },
    [QUEUE_NAMES.presentationFinalize]: { env: 'AI_PREFETCH_FINALIZE', def: 5 },
  }
  const entry = config[queueName]
  if (!entry) return 5
  const raw = process.env[entry.env]
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : entry.def
}

export const DEFAULT_MAX_ATTEMPTS = Number.parseInt(
  process.env.JOB_MAX_ATTEMPTS ?? '5',
  10,
)

export const DEFAULT_RETRY_BASE_MS = Number.parseInt(
  process.env.JOB_RETRY_BASE_MS ?? '1500',
  10,
)
