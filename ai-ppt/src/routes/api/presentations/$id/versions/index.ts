import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'
import { listVersions } from '@/server/presentations/version-service'

export const Route = createFileRoute('/api/presentations/$id/versions/')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

        const versions = await listVersions(session.user.id, params.id)
        if (!versions) return json({ error: 'Presentation not found' }, { status: 404 })

        return json({ versions })
      },
    },
  },
})
