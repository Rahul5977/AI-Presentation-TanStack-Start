import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'
import { addBlankSlide } from '@/server/presentations/slide-service'
import { captureVersion } from '@/server/presentations/version-service'

export const Route = createFileRoute('/api/presentations/$id/slides/')({
  server: {
    handlers: {
      POST: async ({ params }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

        await captureVersion(params.id)
        const result = await addBlankSlide(session.user.id, params.id)
        if (!result) return json({ error: 'Presentation not found' }, { status: 404 })

        return json(result)
      },
    },
  },
})
