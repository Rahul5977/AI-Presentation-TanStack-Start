import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'
import {
  getDraftForUser,
  reorderDraftSlides,
  updateDraftSlide,
} from '@/server/presentations/outline-service'

const updateSlidePayloadSchema = z.object({
  action: z.literal('update-slide'),
  slideId: z.string().min(1),
  data: z.object({
    title: z.string().trim().min(1),
    intent: z.string().trim().min(1),
    bullets: z.array(z.string().trim().min(1)).min(1).max(8),
    visualConcept: z.string().trim().min(1),
    speakerNotesHint: z.string().trim().optional().nullable(),
  }),
})

const reorderPayloadSchema = z.object({
  action: z.literal('reorder'),
  slideIds: z.array(z.string().min(1)).min(1),
})

const patchPayloadSchema = z.union([updateSlidePayloadSchema, reorderPayloadSchema])

export const Route = createFileRoute('/api/drafts/$draftId/')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }

        const draft = await getDraftForUser(session.user.id, params.draftId)
        if (!draft) {
          return json({ error: 'Draft not found' }, { status: 404 })
        }

        return json(draft)
      },
      PATCH: async ({ params, request }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }

        const parsed = patchPayloadSchema.safeParse(await request.json())
        if (!parsed.success) {
          return json({ error: 'Invalid payload' }, { status: 400 })
        }

        try {
          if (parsed.data.action === 'update-slide') {
            await updateDraftSlide(
              session.user.id,
              params.draftId,
              parsed.data.slideId,
              parsed.data.data,
            )
          } else {
            await reorderDraftSlides(
              session.user.id,
              params.draftId,
              parsed.data.slideIds,
            )
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Draft update failed'
          const status = message.includes('not found') ? 404 : 400
          return json({ error: message }, { status })
        }

        const draft = await getDraftForUser(session.user.id, params.draftId)
        if (!draft) {
          return json({ error: 'Draft not found' }, { status: 404 })
        }

        return json(draft)
      },
    },
  },
})
