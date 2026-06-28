import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'
import { isPaddleConfigured, paddleConfig } from '@/server/billing/paddle'

/**
 * Returns everything the client-side Paddle.js overlay needs to start a Pro
 * checkout. The client token is publishable; userId is the caller's own id,
 * passed as customData so the webhook can attribute the subscription.
 */
export const Route = createFileRoute('/api/billing/checkout')({
  server: {
    handlers: {
      GET: async () => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

        return json({
          configured: isPaddleConfigured() && Boolean(paddleConfig.clientToken()),
          clientToken: paddleConfig.clientToken(),
          environment: paddleConfig.environment(),
          prices: {
            monthly: paddleConfig.priceProMonthly(),
            annual: paddleConfig.priceProAnnual(),
          },
          customer: { email: session.user.email },
          userId: session.user.id,
        })
      },
    },
  },
})
