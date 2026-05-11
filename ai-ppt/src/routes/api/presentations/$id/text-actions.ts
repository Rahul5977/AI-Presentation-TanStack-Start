import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'
import { canAccessPresentation } from '@/server/presentations/access'
import type { TextActionRequest } from '@/server/presentations/v11-scaffold'

export const Route = createFileRoute('/api/presentations/$id/text-actions')({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

        const canEdit = await canAccessPresentation(session.user.id, params.id, 'edit')
        if (!canEdit) return json({ error: 'Presentation not found' }, { status: 404 })

        const body = (await request.json()) as TextActionRequest
        return json(
          {
            error:
              `Text action "${body.action}" is scaffolded for v1.1 and not enabled yet.`,
          },
          { status: 501 },
        )
      },
    },
  },
})
