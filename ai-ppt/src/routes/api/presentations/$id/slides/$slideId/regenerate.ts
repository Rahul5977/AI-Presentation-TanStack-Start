import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'
import { triggerSlideContentRegen } from '@/server/presentations/slide-service'
import { captureVersion } from '@/server/presentations/version-service'

export const Route = createFileRoute('/api/presentations/$id/slides/$slideId/regenerate')({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

        const body = (await request.json()) as {
          prompt?: string
          tone?: string
          depth?: string
        }

        await captureVersion(params.id)
        const result = await triggerSlideContentRegen(
          session.user.id,
          params.id,
          params.slideId,
          {
            prompt: body.prompt,
            tone: body.tone,
            depth: body.depth,
          },
        )
        if (!result) return json({ error: 'Slide or presentation not found' }, { status: 404 })

        return json(result)
      },
    },
  },
})
