import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { z } from 'zod'

import { auth } from '@/lib/auth'
import { canAccessPresentation } from '@/server/presentations/access'
import { setSlideData, visualizeSlide } from '@/server/presentations/visualize-service'
import { SLIDE_DATA_KINDS, slideDataSchema } from '@/lib/slide-data'

const visualizeSchema = z.object({
  kind: z.enum(['auto', ...SLIDE_DATA_KINDS]),
})

const setSchema = z.object({
  slideData: slideDataSchema.nullable(),
})

export const Route = createFileRoute(
  '/api/presentations/$id/slides/$slideId/visualize',
)({
  server: {
    handlers: {
      // AI-generate structured data for this slide.
      POST: async ({ params, request }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

        const canEdit = await canAccessPresentation(session.user.id, params.id, 'edit')
        if (!canEdit) return json({ error: 'Presentation not found' }, { status: 404 })

        const parsed = visualizeSchema.safeParse(await request.json().catch(() => ({})))
        const kind = parsed.success ? parsed.data.kind : 'auto'

        const result = await visualizeSlide(params.id, params.slideId, kind)
        if (!result.ok) return json({ error: result.error }, { status: 502 })

        return json({ slideData: result.slideData })
      },

      // Save manual edits to the structured data.
      PATCH: async ({ params, request }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

        const canEdit = await canAccessPresentation(session.user.id, params.id, 'edit')
        if (!canEdit) return json({ error: 'Presentation not found' }, { status: 404 })

        const parsed = setSchema.safeParse(await request.json())
        if (!parsed.success) return json({ error: 'Invalid slide data' }, { status: 400 })

        const result = await setSlideData(params.id, params.slideId, parsed.data.slideData)
        if (!result.ok) return json({ error: result.error }, { status: 400 })

        return json({ slideData: result.slideData })
      },

      // Remove structured data (revert to bullets/image).
      DELETE: async ({ params }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

        const canEdit = await canAccessPresentation(session.user.id, params.id, 'edit')
        if (!canEdit) return json({ error: 'Presentation not found' }, { status: 404 })

        await setSlideData(params.id, params.slideId, null)
        return json({ slideData: null })
      },
    },
  },
})
