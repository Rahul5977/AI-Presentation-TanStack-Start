import { createFileRoute } from '@tanstack/react-router'

import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'
import { deleteDraftSlide, getDraftForUser } from '@/server/presentations/outline-service'

export const Route = createFileRoute('/api/drafts/$draftId/slides/$slideId')({
  server: {
    handlers: {
      DELETE: async ({ params }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }

        try {
          await deleteDraftSlide(session.user.id, params.draftId, params.slideId)
          const draft = await getDraftForUser(session.user.id, params.draftId)
          if (!draft) {
            return json({ error: 'Draft not found' }, { status: 404 })
          }
          return json(draft)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Could not delete slide.'
          const status = message.includes('not found') ? 404 : 400
          return json({ error: message }, { status })
        }
      },
    },
  },
})
