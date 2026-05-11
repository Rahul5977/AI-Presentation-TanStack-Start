import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'
import { triggerSlideContentRegen } from '@/server/presentations/slide-service'
import { captureVersion } from '@/server/presentations/version-service'
import { assertQuota, quotaErrorMessage, recordUsage } from '@/server/usage/service'

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

        try {
          await assertQuota(session.user.id, 'SLIDES_GENERATED')
        } catch (error) {
          return json({ error: quotaErrorMessage(error) }, { status: 429 })
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

        await recordUsage({
          userId: session.user.id,
          presentationId: params.id,
          metric: 'SLIDES_GENERATED',
          type: 'SLIDE_GENERATION_STARTED',
          metadata: {
            source: 'slide-regenerate',
            slideId: params.slideId,
          },
        })

        return json(result)
      },
    },
  },
})
