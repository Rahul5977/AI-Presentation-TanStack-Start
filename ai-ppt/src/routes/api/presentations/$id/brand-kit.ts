import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'
import { canAccessPresentation } from '@/server/presentations/access'
import type { BrandKitDraft } from '@/server/presentations/v11-scaffold'

export const Route = createFileRoute('/api/presentations/$id/brand-kit')({
  server: {
    handlers: {
      PATCH: async ({ params, request }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

        const canEdit = await canAccessPresentation(session.user.id, params.id, 'edit')
        if (!canEdit) return json({ error: 'Presentation not found' }, { status: 404 })

        const body = (await request.json()) as BrandKitDraft
        return json(
          {
            error:
              'Brand kit controls are scaffolded for v1.1 and not enabled yet.',
            received: {
              hasLogo: Boolean(body.logoUrl),
              hasPrimaryColor: Boolean(body.primaryColor),
              hasAccentColor: Boolean(body.accentColor),
            },
          },
          { status: 501 },
        )
      },
    },
  },
})
