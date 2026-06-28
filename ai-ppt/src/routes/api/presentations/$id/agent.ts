import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'
import { AgentUnavailableError, runDeckAgent } from '@/server/ai/deck-agent'
import { BudgetExceededError } from '@/server/ai/runtime'
import { canAccessPresentation } from '@/server/presentations/access'
import { getPresentationProgressForUser } from '@/server/presentations/progress-service'
import { captureWebException } from '@/server/observability/sentry'

export const Route = createFileRoute('/api/presentations/$id/agent')({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

        if (!(await canAccessPresentation(session.user.id, params.id, 'edit'))) {
          return json({ error: 'Presentation not found' }, { status: 404 })
        }

        const body = (await request.json().catch(() => ({}))) as { message?: string }
        const message = body.message?.trim()
        if (!message) return json({ error: 'Message is required.' }, { status: 400 })

        try {
          const result = await runDeckAgent(session.user.id, params.id, message)
          const presentation = await getPresentationProgressForUser(session.user.id, params.id)
          return json({ summary: result.summary, actions: result.actions, presentation })
        } catch (error) {
          if (error instanceof AgentUnavailableError) {
            return json({ error: error.message }, { status: 503 })
          }
          if (error instanceof BudgetExceededError) {
            return json({ error: error.message }, { status: 429 })
          }
          captureWebException(error, {
            endpoint: 'deck-agent',
            userId: session.user.id,
            presentationId: params.id,
          })
          return json(
            { error: 'The deck assistant ran into a problem. Please try again.' },
            { status: 503 },
          )
        }
      },
    },
  },
})
