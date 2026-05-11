import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const Route = createFileRoute('/api/presentations/$id/members')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

        const presentation = await prisma.presentation.findFirst({
          where: { id: params.id, userId: session.user.id },
          select: {
            id: true,
            user: {
              select: { id: true, name: true, email: true },
            },
            members: {
              select: {
                role: true,
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        })
        if (!presentation) return json({ error: 'Not found' }, { status: 404 })

        return json({
          items: [
            {
              role: 'OWNER',
              user: presentation.user,
            },
            ...presentation.members.map((member) => ({
              role: member.role,
              user: member.user,
            })),
          ],
          scaffold: true,
        })
      },

      POST: async () => {
        return json(
          {
            error:
              'Collaboration invite workflow is scaffolded for v1.1 and not enabled yet.',
          },
          { status: 501 },
        )
      },

      DELETE: async () => {
        return json(
          {
            error:
              'Collaboration member removal is scaffolded for v1.1 and not enabled yet.',
          },
          { status: 501 },
        )
      },
    },
  },
})
