import { QUEUE_NAMES } from '../../../src/server/queue/queues'
import { consumeJsonQueue } from '../lib/rabbit'
import { prisma } from '../lib/prisma'
import { publishProgressEvent } from '../lib/redis'

type FinalizeMessage = {
  presentationId: string
  jobId: string
  idempotencyKey: string
  attempt: number
}

export async function startFinalizeConsumer() {
  await consumeJsonQueue<FinalizeMessage>(
    QUEUE_NAMES.presentationFinalize,
    async (payload) => {
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

      const slides = await prisma.slide.findMany({
        where: {
          presentationId: payload.presentationId,
        },
        select: {
          status: true,
        },
      })

      if (slides.length === 0) {
        throw new Error('No slides found for presentation.')
      }

      const hasFailed = slides.some((slide) => slide.status === 'FAILED')
      const allReady = slides.every((slide) => slide.status === 'READY')

      if (!allReady && !hasFailed) {
        await prisma.presentation.update({
          where: { id: payload.presentationId },
          data: { status: 'GENERATING' },
        })
        throw new Error('Presentation still in progress.')
      }

      const nextStatus = hasFailed ? 'FAILED' : 'READY'
      await prisma.$transaction([
        prisma.presentation.update({
          where: { id: payload.presentationId },
          data: {
            status: nextStatus,
            lastEditedAt: new Date(),
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
        type: 'presentation.finalized',
        status: nextStatus,
      })
    },
  )
}
