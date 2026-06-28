import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'
import { userCanVisualize, VISUALIZE_UPGRADE_MESSAGE } from '@/server/billing/entitlements'
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

        if (!(await userCanVisualize(session.user.id))) {
          return json({ error: VISUALIZE_UPGRADE_MESSAGE, upgradeRequired: true }, { status: 403 })
        }

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
