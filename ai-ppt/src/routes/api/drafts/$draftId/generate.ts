import { randomUUID } from 'node:crypto'

import { createFileRoute } from '@tanstack/react-router'

import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'
import { Prisma } from '@/generated/prisma/client'
import { assertBudgetAvailable, BudgetExceededError } from '@/server/ai/runtime'
import { logger } from '@/server/logging/logger'
import { captureWebException } from '@/server/observability/sentry'
import { prisma } from '@/lib/db'
import {
  publishPresentationFinalizeJob,
  publishSlideContentJob,
  publishSlideImageJob,
} from '@/server/queue/publish'
import {
  assertQuota,
  quotaErrorMessage,
  recordUsage,
} from '@/server/usage/service'
import { assertRateLimit, rateLimitErrorMessage } from '@/server/usage/rate-limit'

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

export const Route = createFileRoute('/api/drafts/$draftId/generate')({
  server: {
    handlers: {
      POST: async ({ params }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }

        try {
          await assertRateLimit({
            userId: session.user.id,
            bucket: 'generate',
            failClosed: true,
          })
        } catch (error) {
          return json({ error: rateLimitErrorMessage(error) }, { status: 429 })
        }

        const draft = await prisma.draft.findFirst({
          where: {
            id: params.draftId,
            presentation: { userId: session.user.id },
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
            slides: { orderBy: [{ position: 'asc' }] },
          },
        })

        if (!draft) return json({ error: 'Draft not found' }, { status: 404 })

        if (draft.slides.length === 0) {
          return json({ error: 'Draft has no slides to generate.' }, { status: 400 })
        }

        try {
          await assertQuota(
            session.user.id,
            'SLIDES_GENERATED',
            draft.slides.length,
          )
        } catch (error) {
          return json({ error: quotaErrorMessage(error) }, { status: 429 })
        }

        // Spend-cap kill-switch: don't accept a whole deck's worth of expensive
        // AI work if the global or per-user daily budget is already exhausted.
        try {
          await assertBudgetAvailable(session.user.id)
        } catch (error) {
          if (error instanceof BudgetExceededError) {
            return json({ error: error.message }, { status: 429 })
          }
          throw error
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

        const presentationId = draft.presentation.id
        const withImages = true
        const imageStyle = draft.presentation.imageStyle === 'NONE'
          ? 'ILLUSTRATION'
          : draft.presentation.imageStyle

        // ── Pre-generate all IDs and keys BEFORE the transaction ────────
        // This lets us build bulk createMany payloads with no per-row
        // round-trips, cutting DB calls from 3N+4 → 6 regardless of N.
        const slideRows = draft.slides.map((draftSlide) => {
          const slideId = randomUUID()
          return {
            draftSlide,
            slideId,
            contentJobId: randomUUID(),
            imageJobId: randomUUID(),
            contentKey: `${presentationId}:${slideId}:content:v1`,
            imageKey: `${presentationId}:${slideId}:image:v1`,
          }
        })
        const finalizeJobId = randomUUID()
        const finalizeKey = `${presentationId}:finalize:${randomUUID()}`

        // ── Single transaction — 6 bulk DB calls total ───────────────────
        await prisma.$transaction(
          async (tx) => {
            // 1. Clear previous attempt artefacts
            await tx.generationJob.deleteMany({ where: { presentationId } })
            await tx.slide.deleteMany({ where: { presentationId } })

            // 2. Mark presentation as queued
            await tx.presentation.update({
              where: { id: presentationId },
              data: { status: 'QUEUED', lastEditedAt: new Date() },
            })

            // 3. Bulk-create all slides (1 round-trip)
            await tx.slide.createMany({
              data: slideRows.map(({ slideId, draftSlide }) => ({
                id: slideId,
                presentationId,
                sourceDraftSlideId: draftSlide.id,
                status: 'PENDING',
                position: draftSlide.position,
                title: draftSlide.title,
                intent: draftSlide.intent,
                bullets: draftSlide.bullets ?? [],
                visualConcept: draftSlide.visualConcept,
                speakerNotes: draftSlide.speakerNotesHint,
                slideData: draftSlide.slideData ?? Prisma.JsonNull,
              })),
            })

            // 4. Bulk-create content jobs (1 round-trip)
            await tx.generationJob.createMany({
              data: slideRows.map(({ slideId, contentJobId, contentKey }) => ({
                id: contentJobId,
                presentationId,
                slideId,
                type: 'SLIDE_CONTENT_GENERATE' as const,
                status: 'PENDING' as const,
                idempotencyKey: contentKey,
                payload: {
                  presentationId,
                  slideId,
                  prompt: draft.presentation.prompt,
                  tone: draft.presentation.tone,
                  depth: draft.presentation.depth,
                  language: draft.presentation.language,
                },
              })),
            })

            // 5. Bulk-create image jobs (1 round-trip, only if images enabled)
            if (withImages) {
              await tx.generationJob.createMany({
                data: slideRows.map(({ slideId, imageJobId, imageKey, draftSlide }) => ({
                  id: imageJobId,
                  presentationId,
                  slideId,
                  type: 'SLIDE_IMAGE_GENERATE' as const,
                  status: 'PENDING' as const,
                  idempotencyKey: imageKey,
                  payload: {
                    presentationId,
                    slideId,
                    visualConcept: draftSlide.visualConcept,
                    imageStyle,
                  },
                })),
              })
            }

            // 6. Create finalize job (1 round-trip)
            await tx.generationJob.create({
              data: {
                id: finalizeJobId,
                presentationId,
                type: 'PRESENTATION_FINALIZE',
                status: 'PENDING',
                idempotencyKey: finalizeKey,
                payload: { presentationId },
              },
            })
          },
          // Safety-net: allow up to 30 s even if N is very large
          { timeout: 30_000 },
        )

        // ── Build publish list from pre-generated IDs ────────────────────
        const jobsToPublish: PendingPublishJob[] = []

        for (const { slideId, contentJobId, contentKey, imageJobId, imageKey, draftSlide } of slideRows) {
          jobsToPublish.push({
            type: 'content',
            payload: {
              presentationId,
              slideId,
              jobId: contentJobId,
              idempotencyKey: contentKey,
              attempt: 0,
              prompt: draft.presentation.prompt,
              tone: draft.presentation.tone,
              depth: draft.presentation.depth,
              language: draft.presentation.language,
              userId: session.user.id,
            },
          })

          if (withImages) {
            jobsToPublish.push({
              type: 'image',
              payload: {
                presentationId,
                slideId,
                jobId: imageJobId,
                idempotencyKey: imageKey,
                attempt: 0,
                visualConcept: draftSlide.visualConcept,
                imageStyle,
                userId: session.user.id,
              },
            })
          }
        }

        jobsToPublish.push({
          type: 'finalize',
          payload: {
            presentationId,
            jobId: finalizeJobId,
            idempotencyKey: finalizeKey,
            attempt: 0,
          },
        })

        // ── Publish to RabbitMQ ──────────────────────────────────────────
        try {
          await Promise.all(
            jobsToPublish.map((job) => {
              if (job.type === 'content') return publishSlideContentJob(job.payload)
              if (job.type === 'image') return publishSlideImageJob(job.payload)
              return publishPresentationFinalizeJob(job.payload)
            }),
          )
        } catch (error) {
          captureWebException(error, {
            endpoint: 'draft-generate',
            userId: session.user.id,
            draftId: params.draftId,
          })
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
            error instanceof Error ? error.message : 'Failed to publish generation jobs.'
          return json({ error: message }, { status: 503 })
        }

        await recordUsage({
          userId: session.user.id,
          metric: 'SLIDES_GENERATED',
          quantity: draft.slides.length,
          type: 'SLIDE_GENERATION_STARTED',
          presentationId,
          metadata: { draftId: params.draftId, slideCount: draft.slides.length },
        })

        return json({ presentationId })
      },
    },
  },
})
