import { QUEUE_NAMES } from '../../../src/server/queue/queues'
import { consumeJsonQueue, enqueueJson } from '../lib/rabbit'
import { prisma } from '../lib/prisma'
import { publishProgressEvent } from '../lib/redis'

type FinalizeMessage = {
  presentationId: string
  jobId: string
  idempotencyKey: string
  attempt: number
}

export async function startFinalizeConsumer() {
  const recheckMs = Number.parseInt(
    process.env.FINALIZE_RECHECK_MS ?? '5000',
    10,
  )

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
      const readyCount = slides.filter((slide) => slide.status === 'READY').length

      if (!allReady && !hasFailed) {
        await prisma.$transaction([
          prisma.presentation.update({
            where: { id: payload.presentationId },
            data: { status: 'GENERATING' },
          }),
          prisma.generationJob.update({
            where: { id: payload.jobId },
            data: {
              status: 'PENDING',
              availableAt: new Date(Date.now() + recheckMs),
            },
          }),
        ])

        await publishProgressEvent(payload.presentationId, {
          type: 'presentation.progress',
          stage: 'finalizing',
          status: 'GENERATING',
          readyCount,
          totalSlides: slides.length,
        })

        await enqueueJson(
          QUEUE_NAMES.presentationFinalize,
          payload,
          {
            delayMs: recheckMs,
            messageId: payload.jobId,
            correlationId: payload.presentationId,
          },
        )

        return
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
        stage: 'finalized',
        status: nextStatus,
        readyCount,
        totalSlides: slides.length,
      })
    },
  )
}
