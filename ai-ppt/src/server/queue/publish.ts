import { getRabbitChannel } from '@/server/queue/rabbit'
import { QUEUE_NAMES } from '@/server/queue/queues'

type BaseJobMessage = {
  presentationId: string
  jobId: string
  idempotencyKey: string
  attempt: number
}

export type OutlineJobMessage = BaseJobMessage & {
  draftId: string
  userId: string
}

export type SlideContentJobMessage = BaseJobMessage & {
  slideId: string
  prompt: string
  tone: string
  depth: string
  language: string
  userId?: string
}

export type SlideImageJobMessage = BaseJobMessage & {
  slideId: string
  visualConcept: string
  imageStyle: string
  userId?: string
}

export type SlideImageUploadJobMessage = BaseJobMessage & {
  slideId: string
  imageBase64?: string
  imageUrl?: string
}

export type PresentationFinalizeJobMessage = BaseJobMessage

async function publish(
  queueName: string,
  payload: BaseJobMessage & Record<string, unknown>,
) {
  const channel = await getRabbitChannel()
  channel.sendToQueue(queueName, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
    contentType: 'application/json',
    messageId: payload.jobId,
    correlationId: payload.presentationId,
    timestamp: Date.now(),
    headers: {
      'x-presentation-id': payload.presentationId,
      'x-idempotency-key': payload.idempotencyKey,
    },
  })
}

export async function publishOutlineJob(payload: OutlineJobMessage) {
  await publish(QUEUE_NAMES.outlineGenerate, payload)
}

export async function publishSlideContentJob(payload: SlideContentJobMessage) {
  await publish(QUEUE_NAMES.slideContentGenerate, payload)
}

export async function publishSlideImageJob(payload: SlideImageJobMessage) {
  await publish(QUEUE_NAMES.slideImageGenerate, payload)
}

export async function publishSlideImageUploadJob(payload: SlideImageUploadJobMessage) {
  await publish(QUEUE_NAMES.slideImageUpload, payload)
}

export async function publishPresentationFinalizeJob(
  payload: PresentationFinalizeJobMessage,
) {
  await publish(QUEUE_NAMES.presentationFinalize, payload)
}
