import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'
import { getUserEntitlements } from '@/server/billing/entitlements'
import { getUserSubscription } from '@/server/billing/subscription-service'

export const Route = createFileRoute('/api/billing/me')({
  server: {
    handlers: {
      GET: async () => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

        const [{ plan, features }, subscription] = await Promise.all([
          getUserEntitlements(session.user.id),
          getUserSubscription(session.user.id),
        ])

        return json({
          plan,
          status: subscription?.status ?? null,
          currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
          cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
          features,
        })
      },
    },
  },
})
