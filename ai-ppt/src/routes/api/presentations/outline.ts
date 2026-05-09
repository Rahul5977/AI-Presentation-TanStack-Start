import { createFileRoute } from '@tanstack/react-router'

import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'
import { logger } from '@/server/logging/logger'
import { createDraftFromInput } from '@/server/presentations/outline-service'
import { normalizePresentationInput } from '@/server/presentations/schemas'

export const Route = createFileRoute('/api/presentations/outline')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })

        if (!session) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const parsed = normalizePresentationInput(body)
        if (!parsed.success) {
          return json(
            { error: 'Invalid payload', issues: parsed.error.flatten() },
            { status: 400 },
          )
        }

        try {
          const draft = await createDraftFromInput(session.user.id, parsed.data)
          return json(draft)
        } catch (error) {
          logger.error(
            {
              userId: session.user.id,
              err: error instanceof Error ? error.message : String(error),
            },
            'Outline generation failed',
          )
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to generate draft outline.'
          return json({ error: message }, { status: 503 })
        }
      },
    },
  },
})
