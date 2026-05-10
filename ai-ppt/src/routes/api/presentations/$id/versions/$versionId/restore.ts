import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'
import { restoreVersion } from '@/server/presentations/version-service'

export const Route = createFileRoute(
  '/api/presentations/$id/versions/$versionId/restore',
)({
  server: {
    handlers: {
      POST: async ({ params }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

        const ok = await restoreVersion(session.user.id, params.id, params.versionId)
        if (!ok) return json({ error: 'Version or presentation not found' }, { status: 404 })

        return json({ restored: true })
      },
    },
  },
})
