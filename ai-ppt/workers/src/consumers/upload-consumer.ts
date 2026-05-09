import { QUEUE_NAMES } from '../../../src/server/queue/queues'
import { uploadGeneratedImage } from '../lib/imagekit'
import { consumeJsonQueue } from '../lib/rabbit'
import { prisma } from '../lib/prisma'
import { publishProgressEvent } from '../lib/redis'

type UploadMessage = {
  presentationId: string
  slideId: string
  jobId: string
  idempotencyKey: string
  attempt: number
  imageBase64?: string
  imageUrl?: string
}

export async function startUploadConsumer() {
  await consumeJsonQueue<UploadMessage>(QUEUE_NAMES.slideImageUpload, async (payload) => {
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
      select: {
        id: true,
        status: true,
      },
    })

    if (!slide) {
      throw new Error('Slide not found for image upload.')
    }

    if (!payload.imageBase64 && !payload.imageUrl) {
      throw new Error('Image upload message missing data.')
    }

    const uploaded =
      payload.imageUrl
        ? {
            fileId: payload.imageUrl,
            url: payload.imageUrl,
            width: undefined,
            height: undefined,
            fileType: undefined,
          }
        : await uploadGeneratedImage({
            presentationId: payload.presentationId,
            slideId: payload.slideId,
            base64: payload.imageBase64 as string,
          })

    const asset = await prisma.asset.create({
      data: {
        presentationId: payload.presentationId,
        slideId: payload.slideId,
        provider: 'imagekit',
        providerFileId: uploaded.fileId ?? payload.slideId,
        url: uploaded.url,
        width: uploaded.width ?? null,
        height: uploaded.height ?? null,
        mimeType: uploaded.fileType ?? null,
      },
      select: { id: true },
    })

    const nextStatus = slide.status === 'CONTENT_READY' ? 'READY' : 'IMAGE_READY'
    await prisma.$transaction([
      prisma.slide.update({
        where: { id: payload.slideId },
        data: {
          imageAssetId: asset.id,
          imageUrl: uploaded.url,
          status: nextStatus,
          imageReadyAt: new Date(),
          readyAt: nextStatus === 'READY' ? new Date() : null,
        },
      }),
      prisma.generationJob.update({
        where: { id: payload.jobId },
        data: {
          status: 'SUCCEEDED',
          completedAt: new Date(),
        },
      }),
    ])

    await publishProgressEvent(payload.presentationId, {
      type: 'slide.image.uploaded',
      slideId: payload.slideId,
      status: nextStatus,
      imageUrl: uploaded.url,
    })
  })
}
