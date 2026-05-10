import { randomUUID } from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const Route = createFileRoute('/api/presentations/$id/share')({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

        const body = (await request.json()) as { enable?: boolean }
        const enable = body.enable !== false

        const presentation = await prisma.presentation.findFirst({
          where: { id: params.id, userId: session.user.id },
          select: { id: true, shareToken: true, isPublic: true },
        })
        if (!presentation) return json({ error: 'Presentation not found' }, { status: 404 })

        if (!enable) {
          await prisma.presentation.update({
            where: { id: params.id },
            data: { isPublic: false },
          })
          return json({ isPublic: false, shareToken: presentation.shareToken })
        }

        const shareToken = presentation.shareToken ?? randomUUID()
        await prisma.presentation.update({
          where: { id: params.id },
          data: { isPublic: true, shareToken },
        })
        return json({ isPublic: true, shareToken })
      },
    },
  },
})
