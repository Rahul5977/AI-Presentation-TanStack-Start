import { createFileRoute } from '@tanstack/react-router'

import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const Route = createFileRoute('/api/presentations/history')({
  server: {
    handlers: {
      GET: async () => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })

        if (!session) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }

        const presentations = await prisma.presentation.findMany({
          where: { userId: session.user.id },
          orderBy: [{ updatedAt: 'desc' }],
          take: 20,
          select: {
            id: true,
            title: true,
            status: true,
            lastEditedAt: true,
          },
        })

        return json({ items: presentations })
      },
    },
  },
})
