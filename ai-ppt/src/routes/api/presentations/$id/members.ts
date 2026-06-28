import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { z } from 'zod'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const inviteSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(['EDITOR', 'VIEWER']).default('EDITOR'),
})

const removeSchema = z.object({
  userId: z.string().min(1),
})

/** Only the deck owner may view/manage its members. Returns the owner id, or
 *  null if the caller isn't the owner. */
async function requireOwner(presentationId: string, userId: string): Promise<boolean> {
  const presentation = await prisma.presentation.findFirst({
    where: { id: presentationId, userId },
    select: { id: true },
  })
  return Boolean(presentation)
}

async function listMembers(presentationId: string) {
  const presentation = await prisma.presentation.findUnique({
    where: { id: presentationId },
    select: {
      user: { select: { id: true, name: true, email: true } },
      members: {
        select: { role: true, user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!presentation) return null
  return [
    { role: 'OWNER' as const, user: presentation.user },
    ...presentation.members.map((m) => ({ role: m.role, user: m.user })),
  ]
}

export const Route = createFileRoute('/api/presentations/$id/members')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })
        if (!(await requireOwner(params.id, session.user.id))) {
          return json({ error: 'Not found' }, { status: 404 })
        }
        const items = await listMembers(params.id)
        return json({ items: items ?? [] })
      },

      POST: async ({ params, request }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })
        if (!(await requireOwner(params.id, session.user.id))) {
          return json({ error: 'Not found' }, { status: 404 })
        }

        const parsed = inviteSchema.safeParse(await request.json().catch(() => ({})))
        if (!parsed.success) {
          return json({ error: 'Enter a valid email and role.' }, { status: 400 })
        }

        const invitee = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
          select: { id: true },
        })
        if (!invitee) {
          return json(
            { error: 'No account with that email. Ask them to sign up first.' },
            { status: 404 },
          )
        }
        if (invitee.id === session.user.id) {
          return json({ error: 'You already own this deck.' }, { status: 400 })
        }

        await prisma.presentationMember.upsert({
          where: { presentationId_userId: { presentationId: params.id, userId: invitee.id } },
          create: { presentationId: params.id, userId: invitee.id, role: parsed.data.role },
          update: { role: parsed.data.role },
        })

        const items = await listMembers(params.id)
        return json({ items: items ?? [] })
      },

      DELETE: async ({ params, request }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })
        if (!(await requireOwner(params.id, session.user.id))) {
          return json({ error: 'Not found' }, { status: 404 })
        }

        const parsed = removeSchema.safeParse(await request.json().catch(() => ({})))
        if (!parsed.success) {
          return json({ error: 'Invalid request.' }, { status: 400 })
        }

        await prisma.presentationMember.deleteMany({
          where: { presentationId: params.id, userId: parsed.data.userId },
        })

        const items = await listMembers(params.id)
        return json({ items: items ?? [] })
      },
    },
  },
})
