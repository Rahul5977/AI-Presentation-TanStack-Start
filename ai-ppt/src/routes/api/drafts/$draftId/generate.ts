import { randomUUID } from 'node:crypto'

import { createFileRoute } from '@tanstack/react-router'

import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'
import { logger } from '@/server/logging/logger'
import { prisma } from '@/lib/db'
import {
  publishPresentationFinalizeJob,
  publishSlideContentJob,
  publishSlideImageJob,
} from '@/server/queue/publish'

type PendingPublishJob =
  | {
      type: 'content'
      payload: Parameters<typeof publishSlideContentJob>[0]
    }
  | {
      type: 'image'
      payload: Parameters<typeof publishSlideImageJob>[0]
    }
  | {
      type: 'finalize'
      payload: Parameters<typeof publishPresentationFinalizeJob>[0]
    }

function idempotencyKey(parts: Array<string>) {
  return parts.join(':')
}

export const Route = createFileRoute('/api/drafts/$draftId/generate')({
  server: {
    handlers: {
      POST: async ({ params }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }

        const draft = await prisma.draft.findFirst({
          where: {
            id: params.draftId,
            presentation: {
              userId: session.user.id,
            },
          },
          include: {
            presentation: {
              select: {
                id: true,
                status: true,
                prompt: true,
                imageStyle: true,
                tone: true,
                depth: true,
                language: true,
              },
            },
            slides: {
              orderBy: [{ position: 'asc' }],
            },
          },
        })

        if (!draft) {
          return json({ error: 'Draft not found' }, { status: 404 })
        }

        if (draft.slides.length === 0) {
          return json({ error: 'Draft has no slides to generate.' }, { status: 400 })
        }

        if (
          draft.presentation.status === 'QUEUED' ||
          draft.presentation.status === 'GENERATING'
        ) {
          return json(
            {
              error: 'Presentation is already in progress.',
              presentationId: draft.presentation.id,
            },
            { status: 409 },
          )
        }

        const jobsToPublish: PendingPublishJob[] = []
        const presentationId = draft.presentation.id

        await prisma.$transaction(async (tx) => {
          await tx.generationJob.deleteMany({
            where: { presentationId },
          })
          await tx.slide.deleteMany({
            where: { presentationId },
          })

          await tx.presentation.update({
            where: { id: presentationId },
            data: {
              status: 'QUEUED',
              lastEditedAt: new Date(),
            },
          })

          for (const draftSlide of draft.slides) {
            const slide = await tx.slide.create({
              data: {
                presentationId,
                sourceDraftSlideId: draftSlide.id,
                status: 'PENDING',
                position: draftSlide.position,
                title: draftSlide.title,
                intent: draftSlide.intent,
                bullets: draftSlide.bullets,
                visualConcept: draftSlide.visualConcept,
                speakerNotes: draftSlide.speakerNotesHint,
              },
            })

            const contentIdempotencyKey = idempotencyKey([
              presentationId,
              slide.id,
              'content',
              'v1',
            ])

            const contentJob = await tx.generationJob.create({
              data: {
                presentationId,
                slideId: slide.id,
                type: 'SLIDE_CONTENT_GENERATE',
                status: 'PENDING',
                idempotencyKey: contentIdempotencyKey,
                payload: {
                  presentationId,
                  slideId: slide.id,
                  prompt: draft.presentation.prompt,
                  tone: draft.presentation.tone,
                  depth: draft.presentation.depth,
                  language: draft.presentation.language,
                },
              },
              select: { id: true },
            })

            jobsToPublish.push({
              type: 'content',
              payload: {
                presentationId,
                slideId: slide.id,
                jobId: contentJob.id,
                idempotencyKey: contentIdempotencyKey,
                attempt: 0,
                prompt: draft.presentation.prompt,
                tone: draft.presentation.tone,
                depth: draft.presentation.depth,
                language: draft.presentation.language,
              },
            })

            if (draft.presentation.imageStyle !== 'NONE') {
              const imageIdempotencyKey = idempotencyKey([
                presentationId,
                slide.id,
                'image',
                'v1',
              ])

              const imageJob = await tx.generationJob.create({
                data: {
                  presentationId,
                  slideId: slide.id,
                  type: 'SLIDE_IMAGE_GENERATE',
                  status: 'PENDING',
                  idempotencyKey: imageIdempotencyKey,
                  payload: {
                    presentationId,
                    slideId: slide.id,
                    visualConcept: draftSlide.visualConcept,
                    imageStyle: draft.presentation.imageStyle,
                  },
                },
                select: { id: true },
              })

              jobsToPublish.push({
                type: 'image',
                payload: {
                  presentationId,
                  slideId: slide.id,
                  jobId: imageJob.id,
                  idempotencyKey: imageIdempotencyKey,
                  attempt: 0,
                  visualConcept: draftSlide.visualConcept,
                  imageStyle: draft.presentation.imageStyle,
                },
              })
            }
          }

          const finalizeIdempotencyKey = idempotencyKey([
            presentationId,
            'finalize',
            randomUUID(),
          ])

          const finalizeJob = await tx.generationJob.create({
            data: {
              presentationId,
              type: 'PRESENTATION_FINALIZE',
              status: 'PENDING',
              idempotencyKey: finalizeIdempotencyKey,
              payload: { presentationId },
            },
            select: { id: true },
          })

          jobsToPublish.push({
            type: 'finalize',
            payload: {
              presentationId,
              jobId: finalizeJob.id,
              idempotencyKey: finalizeIdempotencyKey,
              attempt: 0,
            },
          })
        })

        try {
          await Promise.all(
            jobsToPublish.map((job) => {
              if (job.type === 'content') {
                return publishSlideContentJob(job.payload)
              }
              if (job.type === 'image') {
                return publishSlideImageJob(job.payload)
              }
              return publishPresentationFinalizeJob(job.payload)
            }),
          )
        } catch (error) {
          logger.error(
            {
              presentationId,
              draftId: params.draftId,
              err: error instanceof Error ? error.message : String(error),
            },
            'Failed to publish generation jobs',
          )
          await prisma.presentation.update({
            where: { id: presentationId },
            data: { status: 'FAILED' },
          })
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to publish generation jobs.'
          return json({ error: message }, { status: 503 })
        }

        return json({ presentationId })
      },
    },
  },
})
