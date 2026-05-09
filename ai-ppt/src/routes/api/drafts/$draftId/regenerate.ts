import { createFileRoute } from '@tanstack/react-router'

import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'
import { regenerateDraftOutline } from '@/server/presentations/outline-service'

export const Route = createFileRoute('/api/drafts/$draftId/regenerate')({
  server: {
    handlers: {
      POST: async ({ params }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }

        try {
          const draft = await regenerateDraftOutline(session.user.id, params.draftId)
          return json(draft)
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Could not regenerate outline.'
          const status = message.includes('not found') ? 404 : 503
          return json({ error: message }, { status })
        }
      },
    },
  },
})
