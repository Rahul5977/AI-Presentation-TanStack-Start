import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'
import { deleteBrandKit } from '@/server/presentations/brand-kit-service'

export const Route = createFileRoute('/api/brand-kits/$kitId')({
  server: {
    handlers: {
      DELETE: async ({ params }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

        const deleted = await deleteBrandKit(session.user.id, params.kitId)
        if (!deleted) return json({ error: 'Brand kit not found' }, { status: 404 })

        return json({ ok: true })
      },
    },
  },
})
