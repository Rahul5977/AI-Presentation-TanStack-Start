import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'
import { duplicateSlide } from '@/server/presentations/slide-service'

export const Route = createFileRoute('/api/presentations/$id/slides/$slideId/duplicate')({
  server: {
    handlers: {
      POST: async ({ params }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

        const result = await duplicateSlide(session.user.id, params.id, params.slideId)
        if (!result) return json({ error: 'Slide not found' }, { status: 404 })

        return json(result)
      },
    },
  },
})
