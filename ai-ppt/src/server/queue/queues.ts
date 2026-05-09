export const QUEUE_NAMES = {
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

export const DEFAULT_MAX_ATTEMPTS = Number.parseInt(
  process.env.JOB_MAX_ATTEMPTS ?? '5',
  10,
)

export const DEFAULT_RETRY_BASE_MS = Number.parseInt(
  process.env.JOB_RETRY_BASE_MS ?? '1500',
  10,
)
