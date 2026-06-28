import { callModel, getFallbackChain } from '../../../src/server/ai/runtime'
import { publishSlideImageUploadJob } from '../../../src/server/queue/publish'
import { QUEUE_NAMES } from '../../../src/server/queue/queues'
import { consumeJsonQueue } from '../lib/rabbit'
import { generateSlideImageBase64 as generateSlideImageWithImagen } from '../lib/gemini'
import { generateSlideImageBase64 as generateSlideImageWithOpenAI } from '../lib/openai'
import { prisma } from '../lib/prisma'
import { publishProgressEvent } from '../lib/redis'

type ImageMessage = {
  presentationId: string
  slideId: string
  jobId: string
  idempotencyKey: string
  attempt: number
  visualConcept: string
  imageStyle: string
  // Populated end-to-end in W4 for per-user budget attribution; optional here.
  userId?: string
}

export async function startImageConsumer() {
  await consumeJsonQueue<ImageMessage>(QUEUE_NAMES.slideImageGenerate, async (payload) => {
    const job = await prisma.generationJob.findUnique({
      where: { id: payload.jobId },
      select: { status: true },
    })
    if (job?.status === 'SUCCEEDED') return

    await prisma.generationJob.updateMany({
      where: { id: payload.jobId },
      data: {
        status: 'RUNNING',
        attempt: payload.attempt + 1,
        lockedAt: new Date(),
      },
    })

    const slide = await prisma.slide.findUnique({
      where: { id: payload.slideId },
      select: { imagePrompt: true },
    })
    if (!slide) {
      throw new Error('Slide not found for image generation.')
    }

    const imageInput = {
      visualConcept: payload.visualConcept,
      imageStyle: payload.imageStyle,
      imagePrompt: slide.imagePrompt ?? undefined,
    }
    // No response cache for images: base64 payloads are too large for Redis.
    const generation = await callModel({
      op: 'image',
      kind: 'image',
      chain: getFallbackChain('image'),
      userId: payload.userId,
      run: async ({ provider, model, signal }) =>
        provider === 'openai'
          ? await generateSlideImageWithOpenAI(imageInput, { model, signal })
          : await generateSlideImageWithImagen(imageInput, { model, signal }),
    })
    const imageBase64 = generation.value

    const uploadIdempotencyKey = `${payload.presentationId}:${payload.slideId}:upload:v1`
    const uploadJob = await prisma.generationJob.upsert({
      where: { idempotencyKey: uploadIdempotencyKey },
      create: {
        presentationId: payload.presentationId,
        slideId: payload.slideId,
        type: 'SLIDE_IMAGE_UPLOAD',
        status: 'PENDING',
        idempotencyKey: uploadIdempotencyKey,
        payload: {
          presentationId: payload.presentationId,
          slideId: payload.slideId,
        },
      },
      update: {
        status: 'PENDING',
        payload: {
          presentationId: payload.presentationId,
          slideId: payload.slideId,
        },
      },
      select: { id: true },
    })

    await prisma.generationJob.update({
      where: { id: payload.jobId },
      data: {
        status: 'SUCCEEDED',
        completedAt: new Date(),
        provider: generation.provider,
        model: generation.model,
        estCostUsd: generation.estCostUsd,
      },
    })

    await publishSlideImageUploadJob({
      presentationId: payload.presentationId,
      slideId: payload.slideId,
      jobId: uploadJob.id,
      idempotencyKey: uploadIdempotencyKey,
      attempt: 0,
      imageBase64,
    })

    await publishProgressEvent(payload.presentationId, {
      type: 'slide.image.generated',
      stage: 'generating-image',
      jobType: 'SLIDE_IMAGE_GENERATE',
      slideId: payload.slideId,
      status: 'IMAGE_READY',
      attempt: payload.attempt + 1,
    })
  })
}
