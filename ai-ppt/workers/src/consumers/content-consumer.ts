import { QUEUE_NAMES } from '../../../src/server/queue/queues'
import { consumeJsonQueue } from '../lib/rabbit'
import { generateSlideContent } from '../lib/openai'
import { prisma } from '../lib/prisma'
import { publishProgressEvent } from '../lib/redis'

type ContentMessage = {
  presentationId: string
  slideId: string
  jobId: string
  idempotencyKey: string
  attempt: number
  prompt: string
  tone: string
  depth: string
  language: string
}

export async function startContentConsumer() {
  await consumeJsonQueue<ContentMessage>(
    QUEUE_NAMES.slideContentGenerate,
    async (payload) => {
      const job = await prisma.generationJob.findUnique({
        where: { id: payload.jobId },
        select: { status: true },
      })

      if (job?.status === 'SUCCEEDED') {
        return
      }

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
        include: {
          presentation: {
            select: {
              imageStyle: true,
            },
          },
        },
      })

      if (!slide) {
        throw new Error('Slide not found for content generation.')
      }

      const generated = await generateSlideContent({
        prompt: payload.prompt,
        language: payload.language,
        tone: payload.tone,
        depth: payload.depth,
        title: slide.title,
        intent: slide.intent,
        bullets: Array.isArray(slide.bullets) ? (slide.bullets as string[]) : [],
        visualConcept: slide.visualConcept,
      })

      const nextStatus = slide.presentation.imageStyle === 'NONE' ? 'READY' : 'CONTENT_READY'

      await prisma.$transaction([
        prisma.slide.update({
          where: { id: payload.slideId },
          data: {
            title: generated.title,
            intent: generated.intent,
            bullets: generated.bullets,
            speakerNotes: generated.speakerNotes,
            layoutHints: generated.layoutHints,
            imagePrompt: generated.imagePrompt,
            status: nextStatus,
            contentReadyAt: new Date(),
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
        type: 'slide.content.ready',
        stage: 'writing-content',
        jobType: 'SLIDE_CONTENT_GENERATE',
        slideId: payload.slideId,
        status: nextStatus,
        attempt: payload.attempt + 1,
      })
    },
  )
}
