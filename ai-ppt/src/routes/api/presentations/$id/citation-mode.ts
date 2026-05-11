import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { canAccessPresentation } from '@/server/presentations/access'
import type { CitationModeConfig } from '@/server/presentations/v11-scaffold'

export const Route = createFileRoute('/api/presentations/$id/citation-mode')({
  server: {
    handlers: {
      PATCH: async ({ params, request }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

        const canEdit = await canAccessPresentation(session.user.id, params.id, 'edit')
        if (!canEdit) return json({ error: 'Presentation not found' }, { status: 404 })

        const body = (await request.json()) as CitationModeConfig
        if (typeof body.enabled !== 'boolean') {
          return json({ error: 'enabled must be a boolean' }, { status: 400 })
        }

        const updated = await prisma.presentation.update({
          where: { id: params.id },
          data: { citationMode: body.enabled },
          select: { id: true, citationMode: true },
        })

        return json({
          ...updated,
          scaffold: true,
          message: 'Citation mode flag is stored; citation rendering lands in v1.1.',
        })
      },
    },
  },
})
