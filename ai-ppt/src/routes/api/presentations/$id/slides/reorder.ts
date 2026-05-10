import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'
import { reorderSlides } from '@/server/presentations/slide-service'

export const Route = createFileRoute('/api/presentations/$id/slides/reorder')({
  server: {
    handlers: {
      PATCH: async ({ params, request }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

        const body = (await request.json()) as { slideIds?: unknown }
        if (!Array.isArray(body.slideIds) || !body.slideIds.every((s) => typeof s === 'string')) {
          return json({ error: 'slideIds must be an array of strings' }, { status: 400 })
        }

        const slides = await reorderSlides(session.user.id, params.id, body.slideIds)
        if (!slides) return json({ error: 'Presentation not found' }, { status: 404 })

        return json({ slides })
      },
    },
  },
})
