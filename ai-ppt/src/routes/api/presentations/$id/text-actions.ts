import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { z } from 'zod'

import { auth } from '@/lib/auth'
import { canAccessPresentation } from '@/server/presentations/access'
import { applySlideTextAction } from '@/server/presentations/text-action-service'
import { TEXT_ACTIONS } from '@/server/ai/text-action-prompt'

const payloadSchema = z.object({
  slideId: z.string().min(1),
  action: z.enum(TEXT_ACTIONS),
})

export const Route = createFileRoute('/api/presentations/$id/text-actions')({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

        const canEdit = await canAccessPresentation(session.user.id, params.id, 'edit')
        if (!canEdit) return json({ error: 'Presentation not found' }, { status: 404 })

        const parsed = payloadSchema.safeParse(await request.json())
        if (!parsed.success) {
          return json({ error: 'Invalid text action payload' }, { status: 400 })
        }

        const result = await applySlideTextAction(
          params.id,
          parsed.data.slideId,
          parsed.data.action,
        )
        if (!result.ok) return json({ error: result.error }, { status: 502 })

        return json({ bullets: result.bullets })
      },
    },
  },
})
