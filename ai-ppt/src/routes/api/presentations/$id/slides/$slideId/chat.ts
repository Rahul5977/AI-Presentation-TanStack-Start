import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { improveSlideWithGemini } from '@/server/ai/gemini'
import { updateSlideContent } from '@/server/presentations/slide-service'
import {
  assertQuota,
  quotaErrorMessage,
  recordUsage,
} from '@/server/usage/service'
import { assertRateLimit, rateLimitErrorMessage } from '@/server/usage/rate-limit'

export const Route = createFileRoute('/api/presentations/$id/slides/$slideId/chat')({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

        const body = (await request.json()) as {
          message?: string
          apply?: boolean
        }

        if (!body.message?.trim()) {
          return json({ error: 'Message is required.' }, { status: 400 })
        }

        try {
          await assertRateLimit({
            userId: session.user.id,
            bucket: 'slide-assistant',
          })
        } catch (error) {
          return json({ error: rateLimitErrorMessage(error) }, { status: 429 })
        }

        try {
          await assertQuota(session.user.id, 'SLIDE_ASSISTANT_REQUESTS')
        } catch (error) {
          return json({ error: quotaErrorMessage(error) }, { status: 429 })
        }

        const slide = await prisma.slide.findFirst({
          where: {
            id: params.slideId,
            presentationId: params.id,
            presentation: { userId: session.user.id },
          },
          select: {
            id: true,
            title: true,
            intent: true,
            bullets: true,
            speakerNotes: true,
            visualConcept: true,
            presentation: {
              select: {
                tone: true,
                depth: true,
                language: true,
              },
            },
          },
        })

        if (!slide) {
          return json({ error: 'Slide or presentation not found.' }, { status: 404 })
        }

        const result = await improveSlideWithGemini({
          instruction: body.message.trim(),
          slide: {
            title: slide.title,
            intent: slide.intent,
            bullets: Array.isArray(slide.bullets) ? (slide.bullets as string[]) : [],
            speakerNotes: slide.speakerNotes,
            visualConcept: slide.visualConcept,
          },
          presentationTone: slide.presentation.tone,
          presentationDepth: slide.presentation.depth,
          language: slide.presentation.language,
        })

        await recordUsage({
          userId: session.user.id,
          presentationId: params.id,
          metric: 'SLIDE_ASSISTANT_REQUESTS',
          type: 'SLIDE_ASSISTANT_USED',
          metadata: { slideId: params.slideId },
        })

        if (!body.apply) {
          return json({
            summary: result.summary,
            suggestion: {
              title: result.title,
              intent: result.intent,
              bullets: result.bullets,
              speakerNotes: result.speakerNotes,
            },
          })
        }

        const updated = await updateSlideContent(
          session.user.id,
          params.id,
          params.slideId,
          {
            title: result.title,
            intent: result.intent,
            bullets: result.bullets,
            speakerNotes: result.speakerNotes,
          },
        )

        if (!updated) {
          return json({ error: 'Failed to apply assistant suggestion.' }, { status: 404 })
        }

        return json({
          summary: result.summary,
          suggestion: {
            title: result.title,
            intent: result.intent,
            bullets: result.bullets,
            speakerNotes: result.speakerNotes,
          },
          applied: updated,
        })
      },
    },
  },
})
