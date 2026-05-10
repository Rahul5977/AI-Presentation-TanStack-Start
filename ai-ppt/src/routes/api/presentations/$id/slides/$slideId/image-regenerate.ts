import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'
import { triggerSlideImageRegen } from '@/server/presentations/slide-service'

export const Route = createFileRoute(
  '/api/presentations/$id/slides/$slideId/image-regenerate',
)({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

        const body = (await request.json()) as { imageStyle?: string }

        const result = await triggerSlideImageRegen(
          session.user.id,
          params.id,
          params.slideId,
          { imageStyle: body.imageStyle },
        )
        if (!result) return json({ error: 'Slide or presentation not found' }, { status: 404 })

        return json(result)
      },
    },
  },
})
