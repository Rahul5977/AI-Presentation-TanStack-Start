import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'
import { updateSlideContent, deleteSlide } from '@/server/presentations/slide-service'
import { captureVersion } from '@/server/presentations/version-service'

export const Route = createFileRoute('/api/presentations/$id/slides/$slideId/')({
  server: {
    handlers: {
      PATCH: async ({ params, request }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

        const body = (await request.json()) as {
          title?: string
          intent?: string
          bullets?: string[]
          speakerNotes?: string
          visualConcept?: string
          layoutHints?: unknown
        }

        const updated = await updateSlideContent(
          session.user.id,
          params.id,
          params.slideId,
          body,
        )
        if (!updated) return json({ error: 'Slide not found' }, { status: 404 })

        return json(updated)
      },

      DELETE: async ({ params }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

        await captureVersion(params.id)
        const result = await deleteSlide(session.user.id, params.id, params.slideId)
        if (!result) return json({ error: 'Slide not found' }, { status: 404 })

        return json(result)
      },
    },
  },
})
