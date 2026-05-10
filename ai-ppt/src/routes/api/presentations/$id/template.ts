import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { TEMPLATE_KINDS } from '@/templates/schema'

const templatePayloadSchema = z.object({
  template: z.enum(TEMPLATE_KINDS),
})

export const Route = createFileRoute('/api/presentations/$id/template')({
  server: {
    handlers: {
      PATCH: async ({ params, request }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }

        const parsed = templatePayloadSchema.safeParse(await request.json())
        if (!parsed.success) {
          return json({ error: 'Invalid template payload' }, { status: 400 })
        }

        const presentation = await prisma.presentation.findFirst({
          where: {
            id: params.id,
            userId: session.user.id,
          },
          select: { id: true },
        })

        if (!presentation) {
          return json({ error: 'Presentation not found' }, { status: 404 })
        }

        const updated = await prisma.$transaction(async (tx) => {
          const nextPresentation = await tx.presentation.update({
            where: { id: params.id },
            data: {
              template: parsed.data.template,
              lastEditedAt: new Date(),
            },
            select: {
              id: true,
              template: true,
            },
          })

          await tx.draft.updateMany({
            where: { presentationId: params.id },
            data: { template: parsed.data.template },
          })

          return nextPresentation
        })

        return json({
          presentationId: updated.id,
          template: updated.template,
        })
      },
    },
  },
})
