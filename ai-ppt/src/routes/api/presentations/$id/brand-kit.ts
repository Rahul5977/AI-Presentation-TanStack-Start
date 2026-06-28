import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { z } from 'zod'

import { auth } from '@/lib/auth'
import { canAccessPresentation } from '@/server/presentations/access'
import { applyPresentationTheme } from '@/server/presentations/theme-service'
import { themeOverridesSchema } from '@/templates/theme'

// Accept either a full overrides object, or `null` to reset to the base template.
const payloadSchema = z.object({
  themeOverrides: themeOverridesSchema.nullable(),
})

export const Route = createFileRoute('/api/presentations/$id/brand-kit')({
  server: {
    handlers: {
      PATCH: async ({ params, request }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

        const canEdit = await canAccessPresentation(session.user.id, params.id, 'edit')
        if (!canEdit) return json({ error: 'Presentation not found' }, { status: 404 })

        const parsed = payloadSchema.safeParse(await request.json())
        if (!parsed.success) {
          return json({ error: 'Invalid brand kit payload' }, { status: 400 })
        }

        const result = await applyPresentationTheme(
          params.id,
          parsed.data.themeOverrides,
        )
        if (!result.ok) return json({ error: result.error }, { status: 400 })

        return json({ themeOverrides: result.themeOverrides })
      },
    },
  },
})
