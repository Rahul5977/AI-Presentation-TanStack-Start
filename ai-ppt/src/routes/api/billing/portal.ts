import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'
import { getPaddle, isPaddleConfigured } from '@/server/billing/paddle'
import { getUserSubscription } from '@/server/billing/subscription-service'
import { captureWebException } from '@/server/observability/sentry'

/**
 * Create a Paddle customer-portal session so the user can manage / cancel their
 * subscription and view invoices. Returns the portal URL to redirect to.
 */
export const Route = createFileRoute('/api/billing/portal')({
  server: {
    handlers: {
      POST: async () => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

        if (!isPaddleConfigured()) {
          return json({ error: 'Billing is not configured.' }, { status: 503 })
        }

        const subscription = await getUserSubscription(session.user.id)
        if (!subscription?.gatewayCustomerId) {
          return json({ error: 'No active subscription found.' }, { status: 400 })
        }

        try {
          const portal = await getPaddle().customerPortalSessions.create(
            subscription.gatewayCustomerId,
            subscription.gatewaySubscriptionId ? [subscription.gatewaySubscriptionId] : [],
          )
          return json({ url: portal.urls.general.overview })
        } catch (error) {
          captureWebException(error, { endpoint: 'billing-portal', userId: session.user.id })
          return json({ error: 'Could not open the billing portal.' }, { status: 502 })
        }
      },
    },
  },
})
